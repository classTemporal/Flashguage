import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export default async function register(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required", error: "Email and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = typeof name === "string" && name.trim() ? name.trim() : null;

    if (!cleanEmail.includes("@") || cleanEmail.length < 5) {
      return res.status(400).json({ message: "Please provide a valid email address", error: "Please provide a valid email address" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters", error: "Password must be at least 6 characters" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists. Please sign in.",
        error: "An account with this email already exists. Please sign in.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: cleanName,
        hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
