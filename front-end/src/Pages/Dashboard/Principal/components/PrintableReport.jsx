import React, { useMemo } from 'react'
import apshahLogo from '../../../../assets/images/Apshah_logo.png'
import websiteLogo from '../../../../assets/images/Website_logo.png'

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
  departmentName = 'All Departments',
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

  const displayDepartment = departmentName && departmentName !== '-' && departmentName !== 'All Departments'
    ? (departmentName.toLowerCase().startsWith('department of') ? departmentName : `Department of ${departmentName}`)
    : 'Institute Level (All Departments)'

  const applicantHeaderTitle = memberType === 'Student'
    ? 'Name of student'
    : memberType === 'Faculty'
    ? 'Name of faculty'
    : 'Name of applicant'

  return (
    <div id="principal-print-section" className="principal-print-root">
      <style>
        {`
          @media screen {
            #principal-print-section {
              display: none;
            }
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              height: auto;
              overflow: visible;
              background: #fff !important;
              font-family: "Times New Roman", Times, serif !important;
              color: #000 !important;
            }

            body.principal-report-print * {
              visibility: hidden;
            }

            body.principal-report-print #principal-print-section,
            body.principal-report-print #principal-print-section * {
              visibility: visible;
            }

            body.principal-report-print .reports-screen,
            body.principal-report-print aside,
            body.principal-report-print nav,
            body.principal-report-print header,
            body.principal-report-print footer {
              display: none !important;
            }

            body.principal-report-print #principal-print-section {
              display: block !important;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              background: #fff;
            }

            .principal-print-container {
              width: 100%;
              box-sizing: border-box;
            }

            .principal-print-table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }

            .principal-print-table thead {
              display: table-header-group;
            }

            .principal-print-table tfoot {
              display: table-footer-group;
            }

            .principal-print-table tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .principal-print-table td,
            .principal-print-table th {
              break-inside: avoid;
              page-break-inside: avoid;
              border: 1px solid #000 !important;
            }
          }
        `}
      </style>

      <div className="principal-print-container" style={{ fontFamily: '"Times New Roman", Times, serif', color: '#000' }}>
        {/* Header with Dual Logos and Centered Text */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <img
            src={apshahLogo}
            alt="APSIT Logo"
            style={{ width: '70px', height: '70px', objectFit: 'contain' }}
          />

          <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              PARSHVANATH CHARITABLE TRUST&apos;S
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', margin: '2px 0' }}>
              A. P. SHAH INSTITUTE OF TECHNOLOGY
            </div>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
              {displayDepartment}
            </div>
            <div style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '1px' }}>
              (NBA Accredited)
            </div>
          </div>

          <img
            src={websiteLogo}
            alt="College Crest"
            style={{ width: '70px', height: '70px', objectFit: 'contain' }}
          />
        </div>

        {/* Title */}
        <h2 style={{ textAlign: 'center', fontSize: '14.5px', fontWeight: 'bold', margin: '16px 0 16px 0' }}>
          {`NPTEL reimbursement details for ${titleRange}`}
        </h2>

        {/* Tabulated Records */}
        <table
          className="principal-print-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: '11px'
          }}
        >
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', width: '7%', fontWeight: 'bold' }}>Sr. No</th>
              <th style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left', width: '31%', fontWeight: 'bold' }}>{applicantHeaderTitle}</th>
              <th style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left', width: '40%', fontWeight: 'bold' }}>Nptel course name</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', width: '10%', fontWeight: 'bold' }}>Score</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', width: '12%', fontWeight: 'bold' }}>Amount in Rs.</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.srNo}>
                  <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', verticalAlign: 'middle' }}>{row.srNo}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{row.applicantName}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{row.courseName}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', verticalAlign: 'middle' }}>{row.marks}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', verticalAlign: 'middle' }}>{row.amount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>
                  No reimbursement records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Dual Signatures Block Exactly Matching Sample */}
        <div style={{ marginTop: '45px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '12px' }}>
          <div style={{ textAlign: 'left', width: '45%' }}>
            <div style={{ height: '35px' }}></div>
            <div style={{ fontWeight: 'bold' }}>
              Head of Department
            </div>
            <div>
              {displayDepartment}
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
