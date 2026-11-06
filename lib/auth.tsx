"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "customer" | "partner" | "admin";

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  email: string;
  role: UserRole;
  businessName: string;
  businessType: string;
  gstin?: string;
  udyamNumber?: string;
  city: string;
  avatar?: string;
}

export const DEMO_USERS: UserProfile[] = [
  {
    id: "USR-001",
    name: "Dr. Neha Banerjee",
    mobile: "9876543210",
    email: "neha.banerjee@neelgiriphysio.com",
    role: "customer",
    businessName: "Neelgiri Physio Clinic",
    businessType: "Professional Office / Clinic",
    gstin: "07CPCXN0398P1ZT",
    udyamNumber: "UDYAM-DL-00-9565547",
    city: "New Delhi",
    avatar: "https://images.unsplash.com/photo-1594824813583-097585040e3f?w=120"
  },
  {
    id: "USR-002",
    name: "Karthik Fernandes",
    mobile: "9812345678",
    email: "karthik@krishnapharma.in",
    role: "customer",
    businessName: "Krishna Pharma Retail",
    businessType: "Micro Retail & Services",
    gstin: "37IHKXV5167L1ZS",
    city: "Visakhapatnam",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120"
  },
  {
    id: "USR-003",
    name: "Suresh Sharma",
    mobile: "9845012345",
    email: "suresh.sharma@metrotelecom.in",
    role: "partner",
    businessName: "Metro Telecom Solutions (Tier-1 Partner)",
    businessType: "Authorized Channel Partner",
    city: "Bengaluru",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120"
  },
  {
    id: "USR-004",
    name: "Priya Nair",
    mobile: "9820098765",
    email: "priya.nair@airtel.com",
    role: "admin",
    businessName: "Airtel Enterprise B2B Business",
    businessType: "Regional Head - Enterprise MSME",
    city: "Mumbai",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120"
  }
];

interface AuthContextType {
  user: UserProfile | null;
  loginWithOtp: (mobile: string, otp: string, role?: UserRole) => Promise<boolean>;
  loginAsDemoUser: (user: UserProfile) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loginWithOtp: async () => false,
  loginAsDemoUser: () => {},
  logout: () => {},
  isAuthenticated: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("airtel_sync_user");
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        // Default to Dr. Neha Banerjee for instant frictionless preview
        setUser(DEMO_USERS[0]);
        localStorage.setItem("airtel_sync_user", JSON.stringify(DEMO_USERS[0]));
      }
    } catch {
      setUser(DEMO_USERS[0]);
    }
  }, []);

  const loginWithOtp = async (mobile: string, otp: string, role: UserRole = "customer"): Promise<boolean> => {
    // Validates mobile & standard test OTP
    if (otp !== "123456" && otp.length !== 6) {
      throw new Error("Invalid OTP. For demo/testing use OTP: 123456");
    }

    const matched = DEMO_USERS.find((u) => u.mobile === mobile) || {
      id: `USR-${Date.now().toString().slice(-4)}`,
      name: role === "partner" ? "Partner Executive" : "Business Owner",
      mobile,
      email: `${mobile}@business.in`,
      role,
      businessName: role === "partner" ? "City Connectivity Partner" : "My Enterprise",
      businessType: role === "partner" ? "Authorized Channel Partner" : "Micro Retail & Services",
      city: "Mumbai"
    };

    setUser(matched);
    localStorage.setItem("airtel_sync_user", JSON.stringify(matched));
    return true;
  };

  const loginAsDemoUser = (demoUser: UserProfile) => {
    setUser(demoUser);
    localStorage.setItem("airtel_sync_user", JSON.stringify(demoUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("airtel_sync_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loginWithOtp,
        loginAsDemoUser,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
