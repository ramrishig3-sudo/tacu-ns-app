"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import CryptoJS from "crypto-js";

export default function HashGenerator() {
  const [input, setInput] = useState("");

  const md5Hash = input ? CryptoJS.MD5(input).toString() : "";
  const sha256Hash = input ? CryptoJS.SHA256(input).toString() : "";
  const sha512Hash = input ? CryptoJS.SHA512(input).toString() : "";

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-20 pt-32 px-6">
      <div className="max-w-4xl mx-auto">
         <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6">
               <Hash className="w-8 h-8 text-teal-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Hash Generator</h1>
            <p className="text-neutral-400">Instantly compute cryptographic hashes for your strings. All hashes are calculated client-side and never leave your browser.</p>
         </motion.div>

         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
             <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-teal-500/20 to-blue-500/20">
                <textarea
                  className="w-full h-32 bg-neutral-900 rounded-xl p-4 text-white placeholder-neutral-500 focus:outline-none resize-none font-mono"
                  placeholder="Enter string to hash..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
             </div>

             <div className="space-y-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                   <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-2">MD5</h3>
                   <code className="text-teal-300 break-all">{md5Hash || "e4d909c290d0fb1ca068ffaddf22cbd0"}</code>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                   <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-2">SHA-256</h3>
                   <code className="text-blue-300 break-all">{sha256Hash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}</code>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                   <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-2">SHA-512</h3>
                   <code className="text-purple-300 break-all">{sha512Hash || "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e"}</code>
                </div>
             </div>
         </motion.div>
      </div>
    </main>
  );
}
