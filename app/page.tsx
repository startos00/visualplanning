"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Folder, Trash2, Clock, Map, LogOut } from "lucide-react";
import { getUserProjects, createProject, deleteProject } from "@/app/actions/projects";
import { authClient } from "@/app/lib/auth-client";
import { DumboOctopusCornerLogo } from "@/app/components/DumboOctopusCornerLogo";
import { DeepSeaBackground } from "@/app/components/auth/DeepSeaBackground";
import { toast } from "sonner";

export default function MissionControl() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function init() {
      const session = await authClient.getSession();
      if (!session?.data) {
        router.push("/login");
        return;
      }
      setUser(session.data.user);

      const userProjects = await getUserProjects();
      setProjects(userProjects);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    const result = await createProject(newProjectName);
    if (result.success && result.project) {
      toast.success(`Sector ${newProjectName} deployed!`);
      router.push(`/project/${result.project.id}`);
    } else {
      toast.error("Failed to deploy sector");
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to decommission this sector? All data will be lost.")) {
      const result = await deleteProject(id);
      if (result.success) {
        setProjects(projects.filter((p) => p.id !== id));
        toast.info("Sector decommissioned");
      } else {
        toast.error("Failed to decommission sector");
      }
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-cyan-50">
        <DeepSeaBackground />
        <div className="z-10 flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-widest text-cyan-400/80">INITIALIZING MISSION CONTROL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-slate-950 text-slate-200">
      <DeepSeaBackground />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-4">
          <DumboOctopusCornerLogo size={40} decorative />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-cyan-50">Mission Control</h1>
            <p className="text-xs text-cyan-400/60 uppercase tracking-widest">Deep Sea Research Laboratory</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-sm font-medium text-slate-300">{user?.name}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{user?.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
            title="Surface (Sign Out)"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-8 py-12">
        <div className="mb-12 flex flex-col gap-2">
          <h2 className="text-3xl font-light text-white">Your Research Sectors</h2>
          <p className="text-slate-400">Select a sector to continue your mission or deploy a new one.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Create New Project Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-dashed border-cyan-500/30 bg-cyan-500/5 p-8 transition-all hover:border-cyan-500/60 hover:bg-cyan-500/10"
          >
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400">
                <Plus size={24} />
              </div>
              <h3 className="mb-2 text-xl font-medium text-white">Deploy New Sector</h3>
              <p className="text-sm text-slate-400">Initialize a new isolated research workspace.</p>
            </div>

            <form onSubmit={handleCreateProject} className="mt-8 flex flex-col gap-3">
              <input
                type="text"
                placeholder="Sector Name (e.g. Mariana Trench)"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isCreating || !newProjectName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-cyan-500 disabled:opacity-50"
              >
                {isCreating ? "Deploying..." : "Initialize Sector"}
              </button>
            </form>
          </motion.div>

          {/* Project Cards */}
          <AnimatePresence>
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/project/${project.id}`)}
                className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 p-8 transition-all hover:border-cyan-500/40 hover:bg-slate-900/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]"
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-cyan-500/5 blur-3xl transition-all group-hover:bg-cyan-500/10"></div>
                
                <div className="relative">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-colors">
                      <Map size={24} />
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-rose-500/20 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                      title="Decommission Sector"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <h3 className="mb-2 text-xl font-medium text-white group-hover:text-cyan-100 transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-4">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
                    <Clock size={10} />
                    <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    ENTER SECTOR
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {projects.length === 0 && !loading && (
          <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-slate-800/50 bg-slate-900/20 py-24 text-center">
            <div className="mb-4 text-slate-600">
              <Folder size={64} strokeWidth={1} />
            </div>
            <h3 className="text-xl font-medium text-slate-400">No active sectors found</h3>
            <p className="mt-2 text-slate-500">Deploy your first research mission to begin.</p>
          </div>
        )}
      </main>

      <footer className="relative z-10 mt-auto py-8 text-center text-[10px] uppercase tracking-widest text-slate-600">
        &copy; {new Date().getFullYear()} Grimpo Deep Sea Research Framework • All Rights Reserved
      </footer>
    </div>
  );
}
