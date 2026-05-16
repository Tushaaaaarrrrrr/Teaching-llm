const fs = require('fs');
const file = 'src/app/(dashboard)/courses/explore/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update state for bundleAccessType
content = content.replace(
  /const \[bundleSelectedForPurchase, setBundleSelectedForPurchase\] = useState<Record<string, 'RECORDED' \| 'LIVE'>>\({}\)/,
  `const [bundleSelectedForPurchase, setBundleSelectedForPurchase] = useState<Record<string, 'RECORDED' | 'LIVE'>>({})\n  const [bundleGlobalAccessType, setBundleGlobalAccessType] = useState<'RECORDED' | 'LIVE'>('RECORDED')`
);

// Update price calculation to use bundle pricing if available
content = content.replace(
  /let totalPrice = 0;\s+let originalTotalPrice = 0;\s+const selectedList = bundleSelectedCoursesToBuy\.length \? bundleSelectedCoursesToBuy : activeBundle\.courses\.map\(\(c: any\) => c\.course\.id\);\s+selectedList\.forEach\(\(courseId: string\) => {[\s\S]*?}\);/,
  `let totalPrice = 0;
                  let originalTotalPrice = 0;
                  const selectedList = bundleSelectedCoursesToBuy.length ? bundleSelectedCoursesToBuy : activeBundle.courses.map((c: any) => c.course.id);
                  const isFixed = activeBundle.allowIndividualPurchase === false;
                  const effectiveAccessType = activeBundle.forceClassType || bundleGlobalAccessType;

                  if (isFixed || selectedList.length === activeBundle.courses.length) {
                    const bundlePrice = effectiveAccessType === 'RECORDED' ? activeBundle.recordedDiscountPrice ?? activeBundle.recordedOriginalPrice : activeBundle.liveDiscountPrice ?? activeBundle.liveOriginalPrice;
                    const bundleOriginal = effectiveAccessType === 'RECORDED' ? activeBundle.recordedOriginalPrice ?? activeBundle.recordedDiscountPrice : activeBundle.liveOriginalPrice ?? activeBundle.liveDiscountPrice;
                    
                    if (bundlePrice != null) {
                      totalPrice = bundlePrice;
                      originalTotalPrice = bundleOriginal || bundlePrice;
                    } else {
                      selectedList.forEach((courseId: string) => {
                        const offering = (activeOfferings as any[]).find(o => o.courseId === courseId);
                        const selectedType = isFixed ? effectiveAccessType : (bundleSelectedForPurchase[courseId] || 'RECORDED');
                        if (selectedType === 'RECORDED') {
                          totalPrice += offering?.recordedDiscountPrice ?? offering?.recordedOriginalPrice ?? 0;
                          originalTotalPrice += offering?.recordedOriginalPrice ?? offering?.recordedDiscountPrice ?? 0;
                        } else {
                          totalPrice += offering?.liveDiscountPrice ?? offering?.liveOriginalPrice ?? 0;
                          originalTotalPrice += offering?.liveOriginalPrice ?? offering?.liveDiscountPrice ?? 0;
                        }
                      });
                    }
                  } else {
                    selectedList.forEach((courseId: string) => {
                      const offering = (activeOfferings as any[]).find(o => o.courseId === courseId);
                      const selectedType = bundleSelectedForPurchase[courseId] || 'RECORDED';
                      if (selectedType === 'RECORDED') {
                        totalPrice += offering?.recordedDiscountPrice ?? offering?.recordedOriginalPrice ?? 0;
                        originalTotalPrice += offering?.recordedOriginalPrice ?? offering?.recordedDiscountPrice ?? 0;
                      } else {
                        totalPrice += offering?.liveDiscountPrice ?? offering?.liveOriginalPrice ?? 0;
                        originalTotalPrice += offering?.liveOriginalPrice ?? offering?.liveDiscountPrice ?? 0;
                      }
                    });
                  }`
);

fs.writeFileSync(file, content);
