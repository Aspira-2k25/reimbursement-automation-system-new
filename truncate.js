const fs = require('fs');
const filePath = 'c:\\reinburse\\reimbursement-automation-system-new\\front-end\\src\\Pages\\Dashboard\\Hod\\pages\\AllDepartmentOverview.jsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
fs.writeFileSync(filePath, lines.slice(0, 459).join('\n'));
console.log('File truncated to 459 lines');
