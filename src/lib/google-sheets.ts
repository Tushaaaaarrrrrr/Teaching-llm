import { google } from "googleapis";

export async function appendEnrollmentToSheet(data: any) {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const values = [[
      new Date().toISOString(),
      data.name,
      data.email,
      data.phone || "",
      data.course,
      data.gender || "",
      "LMS"
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_ENROLLMENTS_SPREADSHEET_ID,
      range: "Sheet1!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

  } catch (err) {
    console.error("Sheets error:", err);
  }
}
