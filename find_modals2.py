import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

                # Search for className="card" or className='card'
                matches = re.finditer(r'className=[\'"]card[\'"]', content)
                for match in matches:
                    start_idx = match.start()
                    # Check 500 characters before the card to see if it's inside a fixed modal overlay
                    context_before = content[max(0, start_idx - 500):start_idx]
                    if 'position: \'fixed\'' in context_before or 'position:"fixed"' in context_before or 'position: "fixed"' in context_before or 'fixed' in context_before and 'inset' in context_before:
                        # Check if it also has stopPropagation to be sure it's the inner modal child
                        context_after = content[start_idx:min(len(content), start_idx + 200)]
                        if 'stopPropagation' in context_after:
                            print(f"Possible glowing card modal in: {path} near index {start_idx}")

