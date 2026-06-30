const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ size: 'A4', margin: 50 });
const pdfPath = path.join(__dirname, 'RentEasy_Collaborator_Guide.pdf');
const stream = fs.createWriteStream(pdfPath);
doc.pipe(stream);

// --- Colors ---
const cPrimary = '#6366f1';
const cDark = '#1e293b';
const cText = '#334155';
const cCodeBg = '#f8fafc';
const cCodeText = '#0f172a';
const cBorder = '#e2e8f0';

// --- Header ---
doc.fillColor(cPrimary).fontSize(26).font('Helvetica-Bold').text('RentEasy', { continued: true });
doc.fillColor(cDark).fontSize(20).font('Helvetica-Bold').text(' – Collaborator Guide\n');

// Horizontal line
doc.moveTo(50, 85).lineTo(545, 85).strokeColor(cBorder).lineWidth(2).stroke();
doc.moveDown(1.5);

doc.fillColor(cText).fontSize(11).font('Helvetica-Oblique').text('A quick onboarding guide to clone, configure, and run the RentEasy Student Rental Platform locally.\n\n', { lineGap: 4 });

// --- Section 1: Prerequisites ---
doc.fillColor(cDark).fontSize(15).font('Helvetica-Bold').text('1. Prerequisites');
doc.moveDown(0.4);
doc.fillColor(cText).fontSize(10.5).font('Helvetica').text('Before starting, ensure you have the following installed on your local system:', { lineGap: 3 });
doc.font('Helvetica-Bold').text('  • Node.js').font('Helvetica').text(' (v18 or higher recommended)').font('Helvetica-Bold').text('  • Git').font('Helvetica').text(' command-line client\n\n');

// --- Section 2: Setup Instructions ---
doc.fillColor(cDark).fontSize(15).font('Helvetica-Bold').text('2. Installation & Setup');
doc.moveDown(0.5);

const addStep = (title, description, command) => {
  doc.fillColor(cPrimary).fontSize(11.5).font('Helvetica-Bold').text(title);
  doc.fillColor(cText).fontSize(10).font('Helvetica').text(description, { lineGap: 2 });
  doc.moveDown(0.3);
  
  // Draw code block container
  const curY = doc.y;
  doc.rect(50, curY, 495, 34).fill(cCodeBg);
  doc.fillColor(cCodeText).fontSize(9.5).font('Courier-Bold').text(command, 62, curY + 11);
  doc.moveDown(1.8);
};

addStep(
  'Step 1: Clone the Repository',
  'Open your shell or terminal and clone the GitHub repository to your local drive:',
  'git clone https://github.com/Abhijithraju11/RentEasy.git\ncd RentEasy'
);

addStep(
  'Step 2: Install All Dependencies',
  'Install packages for the root concurrently manager, the backend server, and the frontend client:',
  'npm run install-all'
);

addStep(
  'Step 3: Run the Development Server',
  'Start both backend API server and frontend client concurrently:',
  'npm run dev'
);

// --- Section 3: Browser ---
doc.fillColor(cPrimary).fontSize(11.5).font('Helvetica-Bold').text('Step 4: Open in Web Browser');
doc.fillColor(cText).fontSize(10).font('Helvetica').text('Open your browser and navigate to the address Vite prints in the terminal (typically http://localhost:5173 or http://localhost:5174 if port 5173 is already in use).\n\n', { lineGap: 2 });

// --- Section 4: Demo Credentials ---
doc.fillColor(cDark).fontSize(14).font('Helvetica-Bold').text('3. Pre-populated Seed Credentials');
doc.moveDown(0.4);
doc.fillColor(cText).fontSize(10).font('Helvetica').text('You do not need to register a new user to test. Use these default accounts to log in instantly:', { lineGap: 3 });
doc.moveDown(0.3);

// Credentials box
const boxY = doc.y;
doc.rect(50, boxY, 495, 50).fill('#f1f5f9');
doc.fillColor(cCodeText).fontSize(9.5).font('Courier-Bold')
  .text('Student Account:  Email: student@test.com  |  Password: password123', 62, boxY + 12)
  .text('Owner Account:    Email: owner@test.com    |  Password: password123', 62, boxY + 28);

doc.moveDown(3);

// Footer note
doc.fillColor(cText).fontSize(9).font('Helvetica-Oblique').text('Note: The backend has been configured to default to Port 5001 to resolve EADDRINUSE conflicts on port 5000.', { align: 'center' });

doc.end();

stream.on('finish', () => {
  console.log('PDF successfully generated.');
});
