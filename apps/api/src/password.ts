import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(plain: string): Promise<string> {
  try {
    return await hash(plain);
  } catch (error) {
    console.error(error);
    throw new Error("Lỗi khi mã hóa mật khẩu");
  }
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return await verify(hash, plain);
}
