const atob = (str: string) => Buffer.from(str, "base64").toString("utf-8");
const btoa = (str: string) => Buffer.from(str, "utf-8").toString("base64");
import fs from "fs";
import path from "path";
export function decodeBase64(input: string): string {
  try {
    return atob(input);
  } catch {
    return input; // If decoding fails, return original
  }
}

export function IsBase64(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  const notBase64 = /[^A-Z0-9+/=]/i;
  if (notBase64.test(str)) return false;

  try {
    atob(str);
    return true;
  } catch {
    return false;
  }
}

export function saveFileToFolder(
  base64Data: string,
  fileName: string,
  id: string,
  folderType: string,
): string {
  try {
    // guard — don't attempt save if no data or filename
    if (!base64Data || !fileName) return '';

    const doctorDocs = process.env.DOCTOR_DOCS || "DoctorDocs";
    // Equivalent to Server.MapPath("~/DoctorDocs/")
    let dirPath = path.join(process.cwd(), doctorDocs);
    let filePath = `~\\${doctorDocs}`;

    if (base64Data.includes(",")) {
      base64Data = base64Data.split(",")[1];
    }

    // ~/DoctorDocs
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }

    // ~/DoctorDocs/{id}
    dirPath = path.join(dirPath, id);
    filePath += `\\${id}`;
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }

    // ~/DoctorDocs/{id}/{folderType}
    dirPath = path.join(dirPath, folderType);
    filePath += `\\${folderType}`;
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }

    // Save file
    const imgPath = path.join(dirPath, fileName);
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(imgPath, buffer);

    // Return same style path as ASP.NET
    return `${filePath}\\${fileName}`;
  } catch (err) {
    console.error("File save error:", err);
    throw err;
  }
}


