import os
import re

card_modal_pattern = re.compile(r'position:\s*[\'"]fixed[\'"].*?rgba\(', re.IGNORECASE | re.DOTALL)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

                # Find typical modal wrappers
                # Basically looking for position: 'fixed' and rgba(0...
                # and then down below looking for className="card" within immediate children
                chunks = content.split('position: \'fixed\'')
                if len(chunks) > 1:
                    for chunk in chunks[1:]:
                        first_200 = chunk[:300]
                        if 'className="card"' in first_200:
                            print(f"Found glowing card modal in: {path}")

