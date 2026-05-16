const fs = require('fs');
const file = 'src/app/(dashboard)/courses/explore/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /buyAll: selectedList\.length === activeBundle\.courses\.length, accessType: 'RECORDED'/g,
  `buyAll: selectedList.length === activeBundle.courses.length, accessType: effectiveAccessType`
);

fs.writeFileSync(file, content);
