const atob = (str: string) => Buffer.from(str, "base64").toString("utf-8");
const btoa = (str: string) => Buffer.from(str, "utf-8").toString("base64");

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
