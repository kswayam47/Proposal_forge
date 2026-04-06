"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Users, UserPlus, X, Check, Shield, Search, Trash2, Smartphone, FileCheck, BarChart3 } from "lucide-react"
import { getAllUsers, updateUserAccess, addUser, deleteUser } from "@/app/dashboard/actions"

interface User {
    email: string
    role: string
    is_active: boolean
    has_sales_navigator_access: boolean
    has_proposal_app_access: boolean
    has_jira_access: boolean
    last_logged_in_at?: string
}

export function UserManagement({ isDarkMode, onClose }: { isDarkMode: boolean, onClose?: () => void }) {
    const [users, setUsers] = useState<User[]>([])
    const [search, setSearch] = useState("")
    const [newEmail, setNewEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ text: "", type: "" })

    const fetchUsers = async () => {
        try {
            const data = await getAllUsers()
            setUsers(data || [])
        } catch (err) {
            console.error("Failed to fetch users:", err)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleToggleAccess = async (email: string, field: keyof User, currentVal: boolean) => {
        try {
            const updates = { [field]: !currentVal }
            const result = await updateUserAccess(email, updates)

            if (result.success) {
                await fetchUsers()
                showMsg("Access updated successfully", "success")
            } else {
                showMsg(result.error || "Failed to update access", "error")
            }
        } catch (err: any) {
            console.log('[ProposalForge] Access update failed:', err)
            showMsg("An unexpected error occurred", "error")
        }
    }

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newEmail.endsWith("@gmail.com")) {
            showMsg("Must be a @gmail.com email", "error")
            return
        }
        setLoading(true)
        try {
            const result = await addUser(newEmail)
            if (result.success) {
                setNewEmail("")
                await fetchUsers()
                showMsg("User added successfully", "success")
            } else {
                showMsg(result.error || "Failed to add user", "error")
            }
        } catch (err) {
            showMsg("An unexpected error occurred", "error")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (email: string) => {
        if (!confirm(`Are you sure you want to remove ${email}?`)) return
        try {
            const result = await deleteUser(email)
            if (result.success) {
                await fetchUsers()
                showMsg("User removed", "success")
            } else {
                showMsg(result.error || "Failed to remove user", "error")
            }
        } catch (err) {
            showMsg("An unexpected error occurred", "error")
        }
    }

    const showMsg = (text: string, type: "success" | "error") => {
        setMessage({ text, type })
        setTimeout(() => setMessage({ text: "", type: "" }), 3000)
    }

    const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))

    const cardBg = isDarkMode ? "bg-slate-900/90" : "bg-white/95"
    const borderCol = isDarkMode ? "border-white/10" : "border-slate-200"
    const textMain = isDarkMode ? "text-white" : "text-slate-900"
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500"

    return (
        <div className="w-full max-w-5xl px-4 md:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${cardBg} backdrop-blur-3xl rounded-3xl border ${borderCol} p-6 md:p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative`}
            >
                <div className="relative">
                    {/* Row 1: Title + Close */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Shield className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h2 className={`text-2xl font-black ${textMain} tracking-tight`}>User Management</h2>
                                <p className={`${textMuted} text-xs font-bold uppercase tracking-widest`}>Control Application Access</p>
                            </div>
                        </div>

                        {onClose && (
                            <button
                                onClick={onClose}
                                className={`p-3 rounded-2xl ${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} transition-all cursor-pointer`}
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Row 2: Add User + Search */}
                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                        <form onSubmit={handleAddUser} className="flex items-center gap-3 flex-shrink-0">
                            <input
                                type="email"
                                placeholder="Enter email..."
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className={`px-4 py-3 rounded-2xl ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-48 md:w-64 text-sm transition-all`}
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-5 h-5" />}
                            </button>
                        </form>

                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`w-full pl-11 pr-4 py-3 rounded-2xl ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50/50 border-slate-200 text-slate-900'} border focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all`}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`${textMuted} text-[10px] font-black uppercase tracking-[0.2em] border-b ${borderCol}`}>
                                    <th className="pb-4 px-4">User Identity</th>
                                    <th className="pb-4 px-4">Sales Navigator</th>
                                    <th className="pb-4 px-4">Proposal App</th>
                                    <th className="pb-4 px-4">JIRA Metrics</th>
                                    <th className="pb-4 px-4 text-center">Settings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user.email} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="py-5 px-4">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-bold ${textMain}`}>{user.email}</span>
                                                <span className={`${textMuted} text-[10px] uppercase font-black`}>{user.role}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-4">
                                            <button
                                                onClick={() => handleToggleAccess(user.email, 'has_sales_navigator_access', user.has_sales_navigator_access)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer ${user.has_sales_navigator_access
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                                    : 'bg-slate-500/5 border-slate-500/10 text-slate-500'
                                                    }`}
                                            >
                                                <Smartphone className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">{user.has_sales_navigator_access ? 'Enabled' : 'Disabled'}</span>
                                            </button>
                                        </td>
                                        <td className="py-5 px-4">
                                            <button
                                                onClick={() => handleToggleAccess(user.email, 'has_proposal_app_access', user.has_proposal_app_access)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer ${user.has_proposal_app_access
                                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                                    : 'bg-slate-500/5 border-slate-500/10 text-slate-500'
                                                    }`}
                                            >
                                                <FileCheck className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">{user.has_proposal_app_access ? 'Enabled' : 'Disabled'}</span>
                                            </button>
                                        </td>
                                        <td className="py-5 px-4">
                                            <button
                                                onClick={() => handleToggleAccess(user.email, 'has_jira_access', user.has_jira_access)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer ${user.has_jira_access
                                                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                                                    : 'bg-slate-500/5 border-slate-500/10 text-slate-500'
                                                    }`}
                                            >
                                                <BarChart3 className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">{user.has_jira_access ? 'Enabled' : 'Disabled'}</span>
                                            </button>
                                        </td>
                                        <td className="py-5 px-4 text-center">
                                            <button
                                                onClick={() => handleDelete(user.email)}
                                                className={`p-2 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer ${textMuted}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <AnimatePresence>
                        {message.text && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold z-50 ${message.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                                    }`}
                            >
                                {message.text}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    )
}
