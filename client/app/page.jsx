"use client";

import dynamic from "next/dynamic";
import { AuthProvider } from "../src/contexts/AuthContext";

const App = dynamic(() => import("../src/App"), { ssr: false });

export default function Home() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
