import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"${process.env.SMTP_FROM_NAME || "Drugs NRA"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;

function buildEmailHtml({ applicantName, body, trackingNumber }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
      <div style="background:#193441;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">Drugs NRA — Sample Submission</h2>
      </div>
      <div style="padding:24px;border:1px solid #e0e0e0;border-top:none">
        <p>Dear ${applicantName || "Applicant"},</p>
        ${body}
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        <p>If you have any questions, please contact us and quote your tracking number.</p>
        <p style="margin-top:32px;color:#666;font-size:12px">This is an automated message. Please do not reply directly to this email.</p>
      </div>
    </div>
  `;
}

export async function sendStatusEmail({ to, applicantName, trackingNumber, status, decisionRemark }) {
  if (!to) return;

  const isRejected = status === "REJECTED";
  const subject = isRejected
    ? `Sample Submission Update — ${trackingNumber}`
    : `Sample Received — ${trackingNumber}`;

  const remarkLine = isRejected && decisionRemark
    ? `<p><strong>Reason:</strong> ${decisionRemark}</p>`
    : "";

  const body = isRejected
    ? `<p>We regret to inform you that your sample submission has been <strong>rejected</strong>.</p>${remarkLine}`
    : `<p>We are pleased to inform you that your sample submission has been <strong>received</strong> and is currently being processed.</p>`;

  await transport.sendMail({
    from: FROM,
    to,
    subject,
    html: buildEmailHtml({ applicantName, body, trackingNumber }),
  });
}

export async function sendLabReportEmail({ to, applicantName, trackingNumber, labReportReceivedDate, labComment }) {
  if (!to) return;

  const commentLine = labComment
    ? `<p><strong>Lab Comment:</strong> ${labComment}</p>`
    : "";

  const body = `
    <p>We are writing to inform you that the laboratory report for your sample submission has been <strong>received</strong>.</p>
    <p><strong>Date Lab Report Received:</strong> ${labReportReceivedDate}</p>
    ${commentLine}
  `;

  await transport.sendMail({
    from: FROM,
    to,
    subject: `Lab Report Received — ${trackingNumber}`,
    html: buildEmailHtml({ applicantName, body, trackingNumber }),
  });
}

export async function sendSubmissionReceiptEmail({ to, applicantName, trackingNumber, templateLabel, productName, genericName, batchNumber, submittedAt }) {
  if (!to) return;

  const rows = [
    ["Submission Type", templateLabel],
    ["Product Name",    productName],
    ["Generic Name",    genericName || "—"],
    ["Batch Number",    batchNumber || "—"],
    ["Applicant",       applicantName],
    ["Date Submitted",  submittedAt ? new Date(submittedAt).toDateString() : "—"],
  ].map(([label, value]) =>
    `<tr><td style="padding:7px 12px;font-size:13px;color:#666;white-space:nowrap">${label}</td><td style="padding:7px 12px;font-size:13px;font-weight:600;color:#222">${value}</td></tr>`
  ).join("");

  const body = `
    <p>Your sample submission has been received. Please keep your tracking number for all follow-up enquiries.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden">
      ${rows}
    </table>
    <p style="color:#666;font-size:12px">If you did not make this submission, please contact us immediately.</p>
  `;

  await transport.sendMail({
    from: FROM,
    to,
    subject: `Submission Receipt — ${trackingNumber}`,
    html: buildEmailHtml({ applicantName, body, trackingNumber }),
  });
}
