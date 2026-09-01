import React, { useMemo } from 'react'
import apshahLogo from '../../../../assets/images/Apshah_logo.png'

const buildDateLabel = (start, end) => {
  if (!start || Number.isNaN(start.getTime())) return ''
  if (!end || Number.isNaN(end.getTime())) {
    return start.toLocaleString('en-US', { month: 'short', year: 'numeric' })
  }

  const startMonth = start.toLocaleString('en-US', { month: 'short' })
  const endMonth = end.toLocaleString('en-US', { month: 'short' })
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  if (startMonth === endMonth && startYear === endYear) {
    return `${startMonth} ${startYear}`
  }

  if (startYear === endYear) {
    return `${startMonth}-${endMonth} ${startYear}`
  }

  return `${startMonth} ${startYear}-${endMonth} ${endYear}`
}

const formatDateRangeLabel = (dateRange = {}, requests = []) => {
  const { startDate, endDate } = dateRange

  if (startDate && endDate) {
    return buildDateLabel(new Date(startDate), new Date(endDate))
  }

  if (startDate) {
    const start = new Date(startDate)
    return buildDateLabel(start, start)
  }

  if (endDate) {
    const end = new Date(endDate)
    return buildDateLabel(end, end)
  }

  const validDates = requests
    .map(request => new Date(request.submittedDate || request.createdAt || request.updatedAt))
    .filter(date => !Number.isNaN(date.getTime()))

  if (validDates.length > 0) {
    const sorted = [...validDates].sort((a, b) => a - b)
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    return buildDateLabel(first, last)
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  return currentMonth >= 6 ? `Jun-Dec ${currentYear}` : `Jan-Jun ${currentYear}`
}

const formatScore = (marks) => {
  if (marks === null || marks === undefined || marks === '') return '-'
  const cleaned = String(marks).replace('%', '').trim()
  return cleaned || '-'
}

const formatRawAmount = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '-'
  const cleaned = String(amount).replace(/[^\d.]/g, '')
  if (!cleaned) return '-'
  const parsed = Number.parseFloat(cleaned)
  if (!Number.isFinite(parsed)) return '-'
  return parsed.toString()
}

const safeValue = (value) => {
  if (value === null || value === undefined) return '-'
  const text = String(value).trim()
  return text || '-'
}

const PrintableReport = ({
  requests = [],
  dateRange = {},
  departmentName = 'Information Technology',
  hodName = '',
  memberType = 'Faculty'
}) => {
  const titleRange = useMemo(() => formatDateRangeLabel(dateRange, requests), [dateRange, requests])

  const rows = useMemo(() => {
    return requests.map((request, index) => ({
      srNo: index + 1,
      applicantName: safeValue(request.applicantName || request.name),
      courseName: safeValue(request.courseName),
      marks: formatScore(request.marks),
      amount: formatRawAmount(request.amount)
    }))
  }, [requests])

  const cleanDept = departmentName && departmentName !== '-' && departmentName !== 'All Departments'
    ? departmentName.replace(/^Department of\s+/i, '')
    : 'Information Technology'

  const applicantHeaderTitle = memberType === 'Student'
    ? 'Name of student'
    : memberType === 'Faculty'
    ? 'Name of faculty'
    : 'Name of applicant'

  return (
    <div id="print-section" className="hod-print-root">
      <style>
        {`
          @media screen {
            #print-section {
              display: none !important;
            }
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              background: #fff !important;
              color: #000 !important;
            }

            body.hod-report-print * {
              visibility: hidden;
            }

            body.hod-report-print #print-section,
            body.hod-report-print #print-section * {
              visibility: visible !important;
            }

            body.hod-report-print .reports-screen,
            body.hod-report-print aside,
            body.hod-report-print nav,
            body.hod-report-print header,
            body.hod-report-print footer {
              display: none !important;
            }

            body.hod-report-print #print-section {
              display: block !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              box-sizing: border-box !important;
              padding: 20mm 20mm 20mm 20mm !important;
              background: #fff !important;
              color: #000 !important;
              font-family: "Times New Roman", Times, serif !important;
            }

            .hod-print-table {
              width: 100% !important;
              border-collapse: collapse !important;
              border: 1px solid #000 !important;
            }

            .hod-print-table thead {
              display: table-header-group !important;
            }

            .hod-print-table tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .hod-print-table th,
            .hod-print-table td {
              border: 1px solid #000 !important;
              color: #000 !important;
            }
          }
        `}
      </style>

      <div
        className="hod-print-container"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: '"Times New Roman", Times, serif',
          color: '#000',
          backgroundColor: '#fff'
        }}
      >
        {/* Header with Dual Logos and Centered Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <img
            src={apshahLogo}
            alt="APSIT Logo Left"
            style={{ width: '70px', height: '70px', objectFit: 'contain' }}
          />

          <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: 'bold', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              PARSHVANATH CHARITABLE TRUST&apos;S
            </div>
            <div style={{ fontSize: '14.5pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '2px 0' }}>
              A. P. SHAH INSTITUTE OF TECHNOLOGY
            </div>
            <div style={{ fontSize: '11.5pt', fontWeight: 'bold' }}>
              Department of {cleanDept}
            </div>
            <div style={{ fontSize: '9.5pt', fontStyle: 'italic', marginTop: '1px' }}>
              (NBA Accredited)
            </div>
          </div>

          <img
            src={apshahLogo}
            alt="APSIT Logo Right"
            style={{ width: '70px', height: '70px', objectFit: 'contain' }}
          />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', fontSize: '12.5pt', fontWeight: 'bold', margin: '18px 0 14px 0' }}>
          {`NPTEL reimbursement details for ${titleRange}`}
        </div>

        {/* Main Tabulated Records */}
        <table
          className="hod-print-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '10.5pt',
            border: '1px solid #000'
          }}
        >
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '8%', fontWeight: 'bold' }}>
                Sr. No
              </th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left', width: '31%', fontWeight: 'bold' }}>
                {applicantHeaderTitle}
              </th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left', width: '39%', fontWeight: 'bold' }}>
                Nptel course name
              </th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '10%', fontWeight: 'bold' }}>
                Score
              </th>
              <th style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'center', width: '12%', fontWeight: 'bold' }}>
                Amount in Rs.
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.srNo}>
                  <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {row.srNo}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>
                    {row.applicantName}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>
                    {row.courseName}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {row.marks}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {row.amount}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ border: '1px solid #000', padding: '16px', textAlign: 'center' }}>
                  No reimbursement records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Dual Signatures Block */}
        <div
          style={{
            marginTop: '50px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            fontSize: '11pt',
            pageBreakInside: 'avoid',
            breakInside: 'avoid'
          }}
        >
          <div style={{ textAlign: 'left', width: '45%' }}>
            <div style={{ height: '35px' }}></div>
            <div style={{ fontWeight: 'bold' }}>
              {hodName || 'Dr. Kiran Deshpande'}
            </div>
            <div>
              {`HoD, ${cleanDept}`}
            </div>
          </div>

          <div style={{ textAlign: 'right', width: '45%' }}>
            <div style={{ height: '35px' }}></div>
            <div style={{ fontWeight: 'bold' }}>
              Principal
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default PrintableReport
