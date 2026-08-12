"use client";

import dynamic from "next/dynamic";
import { AuthProvider } from "../../src/contexts/AuthContext";

const App = dynamic(() => import("../../src/App"), { ssr: false });

export default function SignupPage() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
