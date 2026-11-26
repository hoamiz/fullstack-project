import { pool } from "./db.js";
import { hashPassword, verifyPassword } from "./password.js";
export type User = {
  id: string;
  email: string;
  name: string;
  role?: "admin" | "user";
  password_hash: string;
};
export type OAuthAccount = {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
};
const fakePasswordHash = await hashPassword("123456");

export async function addUser(email: string, name: string, password: string) {
  try {
    const result = await pool.query<User>(
      `
      INSERT INTO users (email,name,password_hash,role)
      VALUES ($1,$2,$3,'user')
      RETURNING id, email, name, role
      `,
      [email, name, password],
    );
    return { success: true, data: result.rows[0], status: 201 };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return { success: false, message: "Email đã tồn tại", status: 409 };
    }
    throw new Error("Lỗi khi thêm người dùng");
  }
}

export async function findUser(email: string, password: string) {
  try {
    const result = await pool.query<User>(
      `
      SELECT id, email, name, password_hash
      FROM users
      WHERE email = $1
      `,
      [email],
    );
    const user = result.rows[0];
    if (!user || !password) {
      await verifyPassword(password, fakePasswordHash);
      return {
        success: false,
        message: "Email hoặc mật khẩu không đúng",
        status: 401,
      };
    } else {
      const isPasswordValid = await verifyPassword(
        password,
        user.password_hash,
      );
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Email hoặc mật khẩu không đúng",
          status: 401,
        };
      }
      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        status: 200,
      };
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error("Lỗi khi tìm kiếm người dùng" + error.message);
    } else {
      throw new Error("Lỗi khi tìm kiếm người dùng");
    }
  }
}

export async function findUserById(id: string) {
  try {
    const result = await pool.query<User>(
      `
      SELECT id, email, name, role
      FROM users
      WHERE id = $1
      `,
      [id],
    );
    if (!result.rows[0]) {
      return {
        success: false,
        message: "Người dùng không tồn tại",
        status: 401,
      };
    }
    return { success: true, data: result.rows[0], status: 200 };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Lỗi khi tìm kiếm người dùng" + error.message);
    } else {
      console.error("Lỗi khi tìm kiếm người dùng");
    }
    return {
      success: false,
      message: "Lỗi khi tìm kiếm người dùng",
      status: 500,
    };
  }
}

export async function addOAuthAccount(
  sub: string,
  email: string,
  name: string,
) {
  try {
    const result = await pool.query<OAuthAccount>(
      `
    SELECT user_id FROM oauth_accounts
    WHERE provider = 'google' AND provider_user_id = $1
    `,
      [sub],
    );
    if (result.rows[0]) {
      return result.rows[0].user_id;
    } else {
      const resultUser = await pool.query<User>(
        `
  SELECT id, role FROM users WHERE email = $1
  `,
        [email],
      );
      if (resultUser.rows[0]) {
        const resultInsert = await pool.query<OAuthAccount>(
          `
          INSERT INTO oauth_accounts (user_id,provider,provider_user_id)
          VALUES ($1,'google', $2)
          RETURNING user_id
          `,
          [resultUser.rows[0].id, sub],
        );
        if (!resultInsert.rows[0]) {
          return null;
        }
        return resultInsert.rows[0].user_id;
      } else {
        const resultInsertUser = await pool.query<User>(
          `
        INSERT INTO users (email,name,password_hash,role)
        VALUES ($1,$2,null,'user')
        RETURNING id
        `,
          [email, name],
        );
        if (!resultInsertUser.rows[0]) {
          return null;
        }
        const resultInsertOAuth = await pool.query<OAuthAccount>(
          `
        INSERT INTO oauth_accounts (user_id,provider,provider_user_id)
        VALUES ($1,'google', $2)
        RETURNING user_id
        `,
          [resultInsertUser.rows[0].id, sub],
        );
        if (!resultInsertOAuth.rows[0]) {
          return null;
        }
        return resultInsertOAuth.rows[0].user_id;
      }
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      const again = await pool.query<OAuthAccount>(
        `
        SELECT user_id FROM oauth_accounts
        WHERE provider = 'google' AND provider_user_id = $1
        `,
        [sub],
      );
      if (again.rows[0]) {
        return again.rows[0].user_id;
      } else {
        return null;
      }
    }
    throw new Error("Lỗi khi thêm tài khoản OAuth");
  }
}
