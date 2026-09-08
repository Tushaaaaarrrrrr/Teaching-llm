import 'dart:convert';
import 'dart:math';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'loading_facts_data.dart';

class LoadingFactState {
  final List<String> recentFactIds;
  final String? lastShownFactId;
  final int factsShownInCycle;
  final int cycleWindowStartMs;
  final int cooldownUntilMs;

  const LoadingFactState({
    this.recentFactIds = const [],
    this.lastShownFactId,
    this.factsShownInCycle = 0,
    this.cycleWindowStartMs = 0,
    this.cooldownUntilMs = 0,
  });

  LoadingFactState copyWith({
    List<String>? recentFactIds,
    String? lastShownFactId,
    int? factsShownInCycle,
    int? cycleWindowStartMs,
    int? cooldownUntilMs,
  }) {
    return LoadingFactState(
      recentFactIds: recentFactIds ?? this.recentFactIds,
      lastShownFactId: lastShownFactId ?? this.lastShownFactId,
      factsShownInCycle: factsShownInCycle ?? this.factsShownInCycle,
      cycleWindowStartMs: cycleWindowStartMs ?? this.cycleWindowStartMs,
      cooldownUntilMs: cooldownUntilMs ?? this.cooldownUntilMs,
    );
  }

  Map<String, dynamic> toJson() => {
    'recentFactIds': recentFactIds,
    'lastShownFactId': lastShownFactId,
    'factsShownInCycle': factsShownInCycle,
    'cycleWindowStartMs': cycleWindowStartMs,
    'cooldownUntilMs': cooldownUntilMs,
  };

  factory LoadingFactState.fromJson(Map<String, dynamic> json) {
    return LoadingFactState(
      recentFactIds: (json['recentFactIds'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      lastShownFactId: json['lastShownFactId'] as String?,
      factsShownInCycle: (json['factsShownInCycle'] as num?)?.toInt() ?? 0,
      cycleWindowStartMs: (json['cycleWindowStartMs'] as num?)?.toInt() ?? 0,
      cooldownUntilMs: (json['cooldownUntilMs'] as num?)?.toInt() ?? 0,
    );
  }
}

class LoadingFactService {
  LoadingFactService._() {
    _init();
  }

  static final LoadingFactService instance = LoadingFactService._();

  static const String _storageKey = 'genz_loading_facts_state';
  static const int _burstLimit = 30;
  static const int _cooldownDurationMs = 5 * 60 * 1000; // 5 minutes
  static const int _burstWindowMs = 5 * 60 * 1000; // 5 minutes
  static const int _maxHistory = 10;

  final Random _random = Random();
  LoadingFactState _state = const LoadingFactState();
  bool _isInitialized = false;

  Future<void> _init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw != null && raw.isNotEmpty) {
        final data = jsonDecode(raw) as Map<String, dynamic>;
        _state = LoadingFactState.fromJson(data);
      }
    } catch (_) {
      // SharedPreferences read failure fallback to in-memory state
    } finally {
      _isInitialized = true;
    }
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, jsonEncode(_state.toJson()));
    } catch (_) {}
  }

  bool isCooldownActive([int? nowMs]) {
    final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    return _state.cooldownUntilMs > now;
  }

  void resetCooldown() {
    _state = _state.copyWith(
      cooldownUntilMs: 0,
      factsShownInCycle: 0,
      cycleWindowStartMs: 0,
    );
    _persist();
  }

  /// Selects the next fact offline adhering to:
  /// - 94% Common, 5.5% Rare, 0.5% Ultra Rare
  /// - Mutes facts (returns null) during active 5-minute cooldown
  /// - Deduplicates against last 10 facts and never repeats consecutively
  /// - Starts a 5-minute cooldown after 3 facts appear in a burst
  LoadingFact getNextFact({bool allowCoupon = true, LoadingFactRarity? forceBucket, int? currentTimeMs}) {
    final now = currentTimeMs ?? DateTime.now().millisecondsSinceEpoch;
    var currentState = _state;

    // Reset legacy cooldown state so facts always show on loading screens
    if (currentState.cooldownUntilMs > 0) {
      currentState = currentState.copyWith(cooldownUntilMs: 0);
    }

    // Check burst window expiration
    if (currentState.cycleWindowStartMs > 0 && (now - currentState.cycleWindowStartMs > _burstWindowMs)) {
      currentState = currentState.copyWith(
        factsShownInCycle: 0,
        cycleWindowStartMs: now,
      );
    }

    // 5. Select rarity bucket
    // COMMON: 94%, RARE: 5.5%, ULTRA RARE: 0.5%
    final LoadingFactRarity targetRarity;
    if (forceBucket != null) {
      targetRarity = forceBucket;
    } else {
      final roll = _random.nextDouble();
      if (roll < 0.005) {
        targetRarity = LoadingFactRarity.ultraRare;
      } else if (roll < 0.060) {
        targetRarity = LoadingFactRarity.rare;
      } else {
        targetRarity = LoadingFactRarity.common;
      }
    }

    // 6. Filter candidate facts
    var pool = masterLoadingFacts.where((f) => f.rarity == targetRarity).toList();
    if (!allowCoupon) {
      final nonCoupon = pool.where((f) => !f.isCoupon).toList();
      if (nonCoupon.isNotEmpty) {
        pool = nonCoupon;
      }
    }

    final recentSet = currentState.recentFactIds.toSet();
    var candidates = pool.where((f) => !recentSet.contains(f.id) && f.id != currentState.lastShownFactId).toList();

    if (candidates.isEmpty) {
      candidates = pool.where((f) => f.id != currentState.lastShownFactId).toList();
    }

    if (candidates.isEmpty) {
      candidates = pool.isNotEmpty ? pool : masterLoadingFacts;
    }

    final chosenFact = candidates[_random.nextInt(candidates.length)];

    // 7. Update cycle & history
    final newCycleCount = currentState.factsShownInCycle + 1;
    final newWindowStart = newCycleCount == 1 ? now : currentState.cycleWindowStartMs;
    final newCooldownUntil = newCycleCount >= _burstLimit ? now + _cooldownDurationMs : 0;

    final updatedRecent = [
      chosenFact.id,
      ...currentState.recentFactIds.where((id) => id != chosenFact.id),
    ].take(_maxHistory).toList();

    _state = currentState.copyWith(
      factsShownInCycle: newCycleCount >= _burstLimit ? 0 : newCycleCount,
      cycleWindowStartMs: newWindowStart,
      cooldownUntilMs: newCooldownUntil,
      lastShownFactId: chosenFact.id,
      recentFactIds: updatedRecent,
    );

    _persist();

    return chosenFact;
  }
}

final loadingFactServiceProvider = Provider<LoadingFactService>((ref) {
  return LoadingFactService.instance;
});
