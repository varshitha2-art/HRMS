import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  Printer,
  RotateCw,
  CheckCircle2,
  Sparkles,
  Layers,
  User,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Employee } from '../../types';

interface DigitalIdCardProps {
  employee: Employee;
  companyName?: string;
  companyAddress?: string;
}

export const DigitalIdCard: React.FC<DigitalIdCardProps> = ({
  employee,
  companyName = 'VPHS SERVICES PVT LTD',
  companyAddress = "Flat no:101, Kakatiya's Marvel, Sri Laxmi Nagar Colony, Monikonda, Hyderabad, Telangana - 500089",
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'both'>('single');
  const [isExporting, setIsExporting] = useState(false);
  const singleCardRef = useRef<HTMLDivElement>(null);
  const bothCardsRef = useRef<HTMLDivElement>(null);

  const qrData = JSON.stringify({
    company: companyName,
    employeeId: employee.employeeId,
    name: `${employee.firstName} ${employee.lastName}`,
    designation: employee.designation?.title || 'Valet Parking',
    department: employee.department?.name || 'Operations',
    site: employee.site?.siteName || 'Corporate',
    mobile: employee.mobile || '7989909607',
    joiningDate: employee.joiningDate,
    status: employee.status,
    verified: true,
    website: 'www.vphs.in',
    helpline: '+91 40 4567 8900',
  });

  const handleDownloadPdf = async () => {
    const targetElement = viewMode === 'both' ? bothCardsRef.current : singleCardRef.current;
    if (!targetElement) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(targetElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');

      if (viewMode === 'both') {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        const yPos = Math.max(10, (pdf.internal.pageSize.getHeight() - pdfHeight) / 2);
        pdf.addImage(imgData, 'PNG', 15, yPos, pdfWidth - 30, pdfHeight);
        pdf.save(`VPHS_ID_Card_DualSide_${employee.employeeId}.pdf`);
      } else {
        // Physical ID card size: 3.125 in x 5.0 in = 79.375 mm x 127.0 mm
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [79.375, 127],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 79.375, 127);
        pdf.save(`VPHS_ID_Card_${isFlipped ? 'Back' : 'Front'}_${employee.employeeId}.pdf`);
      }
    } catch (err) {
      console.error('ID Card export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  /* FRONT SIDE CARD - Exact match to physical card reference with pixel-perfect alignment */
  const renderFrontCard = () => (
    <div className="w-[330px] h-[528px] bg-white rounded-2xl shadow-2xl border border-slate-200 relative overflow-hidden text-[#080d1a] font-sans select-none">
      {/* Top Background Dark Arch Header with Concentric Rings */}
      <div className="absolute top-0 left-0 right-0 h-[220px] pointer-events-none overflow-hidden">
        <svg
          viewBox="0 0 330 220"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="topArchShadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.28" />
            </filter>
          </defs>

          {/* Outer soft ring / arc */}
          <path
            d="M -10 0 L 340 0 L 340 108 Q 165 215 -10 108 Z"
            fill="#f1f5f9"
          />
          <path
            d="M -5 0 L 335 0 L 335 104 Q 165 208 -5 104 Z"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="3"
          />

          {/* Main Dark Navy Arch */}
          <path
            d="M 0 0 L 330 0 L 330 98 Q 165 202 0 98 Z"
            fill="#080d1a"
            filter="url(#topArchShadow)"
          />

          {/* Concentric subtle circular rings inside dark arch */}
          <ellipse
            cx="165"
            cy="44"
            rx="96"
            ry="74"
            fill="none"
            stroke="#162244"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <ellipse
            cx="165"
            cy="44"
            rx="120"
            ry="94"
            fill="none"
            stroke="#111c38"
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Official VPHS Logo Header - Full Size */}
      <div className="absolute top-0 left-0 right-0 pt-2.5 px-2 flex items-center justify-center z-10">
        <img
          src="/vphs_id_logo.png"
          alt="VPHS SERVICES PVT LTD"
          className="h-[76px] w-[290px] max-w-[295px] object-contain drop-shadow-md mx-auto"
        />
      </div>

      {/* Overlapping Employee Portrait Frame - Enlarged Photo */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[106px] z-20">
        <div className="w-[142px] h-[172px] rounded-2xl border-[3.5px] border-[#e5a913] bg-slate-100 shadow-xl overflow-hidden flex items-center justify-center">
          {employee.photoUrl ? (
            <img
              src={employee.photoUrl}
              alt={`${employee.firstName} ${employee.lastName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-400">
              <User className="w-16 h-16 stroke-[1.5] text-slate-400 mb-1" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {employee.firstName[0]}
                {employee.lastName[0]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Yellow Triangular Dot Matrix Accent (Left of Photo) */}
      <div className="absolute left-[30px] top-[198px] z-10 flex items-center gap-[3.5px] pointer-events-none">
        {/* Column 1: 5 dots */}
        <div className="flex flex-col gap-[3.5px]">
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
        </div>
        {/* Column 2: 4 dots */}
        <div className="flex flex-col gap-[3.5px]">
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
        </div>
        {/* Column 3: 3 dots */}
        <div className="flex flex-col gap-[3.5px]">
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
        </div>
        {/* Column 4: 2 dots */}
        <div className="flex flex-col gap-[3.5px]">
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
        </div>
        {/* Column 5: 1 dot */}
        <div className="flex flex-col gap-[3.5px]">
          <div className="w-[3px] h-[3px] rounded-full bg-[#e5a913]" />
        </div>
      </div>

      {/* Employee Credentials Details Section - Perfectly Aligned */}
      <div className="absolute top-[312px] left-0 right-0 px-4 flex flex-col items-center z-10">
        {/* Full Name */}
        <h2 className="text-[17.5px] font-black tracking-wide text-[#080d1a] uppercase text-center leading-tight">
          {employee.firstName} {employee.lastName}
        </h2>

        {/* Navy Divider Line */}
        <div className="w-48 h-[2.5px] bg-[#080d1a] mx-auto mt-1 mb-1.5" />

        {/* Designation */}
        <p className="text-[12px] font-black text-[#080d1a] tracking-wider uppercase text-center italic mb-3">
          {employee.designation?.title || 'VALET PARKING'}
        </p>

        {/* Key-Value Credentials Table */}
        <div className="w-[235px] mx-auto flex flex-col gap-1.5 text-[11px] font-semibold text-[#080d1a]">
          <div className="flex items-center justify-between">
            <span className="w-28 text-left text-slate-700">Employee ID</span>
            <span className="w-4 text-center font-bold">:</span>
            <span className="flex-1 text-left font-bold tracking-wide">
              {employee.employeeId}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="w-28 text-left text-slate-700">Mobile Number</span>
            <span className="w-4 text-center font-bold">:</span>
            <span className="flex-1 text-left font-bold tracking-wide">
              {employee.mobile || '7989909607'}
            </span>
          </div>
        </div>

        {/* Official Website Link */}
        <p className="text-[11.5px] font-bold text-[#080d1a] text-center mt-3 tracking-wide">
          www.vphs.in
        </p>
      </div>

      {/* Bottom Dark Navy Footer Bar with Yellow Stepped Tab */}
      <div className="absolute bottom-0 left-0 right-0 h-[48px] bg-[#080d1a] flex items-center justify-between overflow-hidden z-10">
        {/* Address Lines */}
        <div className="flex-1 pl-3 pr-10 text-center text-[7.5px] font-medium leading-[1.3] text-white flex flex-col justify-center">
          <p>Flat no:101, Kakatiya&apos;s Marvel, Sri Laxmi Nagar Colony,</p>
          <p>Monikonda, Hyderabad, Telangana - 500089</p>
        </div>

        {/* Right Edge Golden Stepped Tab Accent */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-[#e5a913] flex items-center justify-center pointer-events-none">
          {/* Stepped notch extending leftward in the vertical center */}
          <div className="absolute -left-2 top-2.5 bottom-2.5 w-2 bg-[#e5a913]" />
        </div>
      </div>
    </div>
  );

  /* BACK SIDE CARD - Matching cohesive identity with scannable QR & T&C */
  const renderBackCard = () => (
    <div className="w-[330px] h-[528px] bg-white rounded-2xl shadow-2xl border border-slate-200 relative overflow-hidden text-[#080d1a] font-sans select-none flex flex-col justify-between">
      {/* Top Background Dark Arch Header */}
      <div className="absolute top-0 left-0 right-0 h-[155px] pointer-events-none overflow-hidden">
        <svg
          viewBox="0 0 330 155"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="backArchShadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>
          <path
            d="M 0 0 L 330 0 L 330 75 Q 165 145 0 75 Z"
            fill="#080d1a"
            filter="url(#backArchShadow)"
          />
          <ellipse
            cx="165"
            cy="25"
            rx="80"
            ry="55"
            fill="none"
            stroke="#162244"
            strokeWidth="1.5"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* Top Logo & Title */}
      <div className="relative z-10 pt-2.5 px-3 text-center">
        <img
          src="/vphs_id_logo.png"
          alt="VPHS SERVICES PVT LTD"
          className="h-[60px] w-[265px] max-w-[275px] object-contain mx-auto drop-shadow-md"
        />
        <span className="text-[8px] font-black uppercase tracking-[0.24em] text-[#e5a913] block mt-1">
          CREDENTIALS &amp; DEPLOYMENT VERIFICATION
        </span>
      </div>

      {/* Central QR Code & Validation Badge */}
      <div className="relative z-10 flex flex-col items-center mt-2">
        <div className="p-2.5 bg-white rounded-xl shadow-md border-2 border-[#e5a913]">
          <QRCodeSVG value={qrData} size={105} level="M" />
        </div>

        {/* Verification Status */}
        <div className="flex items-center gap-1 text-[9px] font-bold text-[#080d1a] bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full mt-2 shadow-xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>OFFICIAL WORKFORCE RECORD</span>
        </div>

        {/* Validity & Blood Group */}
        <div className="flex items-center gap-3 text-[8.5px] text-slate-700 font-semibold mt-1">
          <span>Valid Through: <strong className="text-[#080d1a]">DEC 2027</strong></span>
          <span>•</span>
          <span>Blood Group: <strong className="text-[#080d1a]">{(employee as any).bloodGroup || 'B+'}</strong></span>
        </div>
      </div>

      {/* Terms, Conditions & Regulations */}
      <div className="relative z-10 mx-4 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[8px] text-slate-700 space-y-1 leading-tight">
        <p className="flex items-start gap-1">
          <span className="text-[#e5a913] font-bold">1.</span>
          <span>This card is the exclusive property of {companyName}.</span>
        </p>
        <p className="flex items-start gap-1">
          <span className="text-[#e5a913] font-bold">2.</span>
          <span>Must be displayed visibly at all times during duty hours on client premises.</span>
        </p>
        <p className="flex items-start gap-1">
          <span className="text-[#e5a913] font-bold">3.</span>
          <span>Non-transferable. Loss must be immediately reported to Corporate HR.</span>
        </p>
        <p className="flex items-start gap-1">
          <span className="text-[#e5a913] font-bold">4.</span>
          <span>If found, please return to corporate address below or contact helpline.</span>
        </p>
        <div className="pt-1 border-t border-slate-200 text-[8px] font-bold text-[#080d1a] flex items-center justify-between">
          <span>24/7 Helpline: +91 40 4567 8900</span>
          <span>hr@vphs.in</span>
        </div>
      </div>

      {/* Bottom Dark Navy Footer Bar with Golden Stepped Tab */}
      <div className="relative z-10 h-[48px] bg-[#080d1a] flex items-center justify-between overflow-hidden">
        {/* Address Lines */}
        <div className="flex-1 pl-3 pr-10 text-center text-[7.5px] font-medium leading-[1.3] text-white flex flex-col justify-center">
          <p>Flat no:101, Kakatiya&apos;s Marvel, Sri Laxmi Nagar Colony,</p>
          <p>Monikonda, Hyderabad, Telangana - 500089</p>
        </div>

        {/* Right Edge Golden Stepped Tab Accent */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-[#e5a913] flex items-center justify-center pointer-events-none">
          <div className="absolute -left-2 top-2.5 bottom-2.5 w-2 bg-[#e5a913]" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Control Action Toolbar */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl shadow-xl">
        {/* View Mode: Single vs Both Sides */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setViewMode('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'single'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" /> Interactive Card
          </button>
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'both'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Dual Side View
          </button>
        </div>

        {/* Flip Button (when single mode) */}
        {viewMode === 'single' && (
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold border border-slate-700 transition-colors shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5" /> Flip to {isFlipped ? 'Front' : 'Back'}
          </button>
        )}

        {/* Download PDF */}
        <button
          onClick={handleDownloadPdf}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md shadow-amber-500/20"
        >
          <Download className="w-3.5 h-3.5" />
          {isExporting
            ? 'Generating...'
            : viewMode === 'both'
            ? 'Download Dual Side PDF'
            : `Download ${isFlipped ? 'Back' : 'Front'} PDF`}
        </button>

        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
      </div>

      {/* Render Single Card View */}
      {viewMode === 'single' && (
        <div ref={singleCardRef} className="p-3 bg-transparent flex flex-col items-center">
          {!isFlipped ? renderFrontCard() : renderBackCard()}
        </div>
      )}

      {/* Render Dual Side View (Side by Side for Print / Full View) */}
      {viewMode === 'both' && (
        <div
          ref={bothCardsRef}
          className="p-4 bg-transparent flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Front Side
            </span>
            {renderFrontCard()}
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Back Side (QR &amp; T&amp;C)
            </span>
            {renderBackCard()}
          </div>
        </div>
      )}
    </div>
  );
};

