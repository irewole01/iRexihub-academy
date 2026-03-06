import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  FileText, 
  Music, 
  Video, 
  Search, 
  LogOut, 
  Plus, 
  Trash2, 
  Download, 
  ExternalLink,
  ChevronRight,
  LayoutDashboard,
  Menu,
  X,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Course, Material, MaterialType } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<MaterialType | 'all'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetchCourses();
    if (token) setIsAdmin(true);
  }, [token]);

  useEffect(() => {
    if (selectedCourse) {
      fetchMaterials(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    const res = await fetch('/api/courses');
    const data = await res.json();
    setCourses(data);
  };

  const fetchMaterials = async (courseId: number) => {
    const res = await fetch(`/api/courses/${courseId}/materials`);
    const data = await res.json();
    setMaterials(data);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username');
    const password = formData.get('password');

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const { token } = await res.json();
      localStorage.setItem('token', token);
      setToken(token);
      setIsAdmin(true);
      setShowLogin(false);
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAdmin(false);
  };

  const filteredMaterials = materials.filter(m => 
    (activeTab === 'all' || m.type === activeTab) &&
    (m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => { setSelectedCourse(null); setActiveTab('all'); }}
          >
            <div className="w-10 h-10 bg-sky rounded-xl flex items-center justify-center shadow-lg shadow-sky/20">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">iRexihub</h1>
              <p className="text-[10px] text-gold uppercase tracking-widest font-bold">Academic Resource Hub</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="input-field pl-10 w-64 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isAdmin ? (
              <div className="flex items-center gap-4">
                <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 text-sm font-medium text-sky hover:text-white transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Educator Login
              </button>
            )}
          </div>

          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <AnimatePresence mode="wait">
          {!selectedCourse ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4 py-12">
                <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
                  Empowering <span className="text-sky">Academic</span> Excellence
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                  Access a comprehensive library of lectures, notes, and practical materials 
                  curated by educators for students. No login required for browsing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <CourseCard 
                    key={course.id} 
                    course={course} 
                    onClick={() => setSelectedCourse(course)} 
                  />
                ))}
                {isAdmin && (
                  <button 
                    onClick={() => setShowLogin(true)}
                    className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-sky/50 hover:bg-sky/5 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-sky/20 transition-all">
                      <Plus className="text-slate-400 group-hover:text-sky" />
                    </div>
                    <span className="text-slate-400 font-medium group-hover:text-sky">Add New Course</span>
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="course-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
                <div className="space-y-2">
                  <button 
                    onClick={() => setSelectedCourse(null)}
                    className="text-sky text-sm font-medium flex items-center gap-1 hover:underline"
                  >
                    Back to Courses
                  </button>
                  <h2 className="text-3xl font-bold text-white">{selectedCourse.name}</h2>
                  <p className="text-gold font-mono text-sm tracking-widest">{selectedCourse.code}</p>
                  <p className="text-slate-400 max-w-3xl">{selectedCourse.description}</p>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => setShowLogin(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Upload Material
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} icon={<BookOpen className="w-4 h-4" />} label="All Materials" />
                <TabButton active={activeTab === 'note'} onClick={() => setActiveTab('note')} icon={<FileText className="w-4 h-4" />} label="Notes" />
                <TabButton active={activeTab === 'pdf'} onClick={() => setActiveTab('pdf')} icon={<FileText className="w-4 h-4" />} label="Lectures (PDF)" />
                <TabButton active={activeTab === 'practical'} onClick={() => setActiveTab('practical')} icon={<ChevronRight className="w-4 h-4" />} label="Practicals" />
                <TabButton active={activeTab === 'audio'} onClick={() => setActiveTab('audio')} icon={<Music className="w-4 h-4" />} label="Audio" />
                <TabButton active={activeTab === 'video'} onClick={() => setActiveTab('video')} icon={<Video className="w-4 h-4" />} label="Videos" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMaterials.map((material) => (
                  <MaterialCard 
                    key={material.id} 
                    material={material} 
                    isAdmin={isAdmin}
                    onDelete={async () => {
                      if (confirm('Delete this material?')) {
                        await fetch(`/api/materials/${material.id}`, { 
                          method: 'DELETE',
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        fetchMaterials(selectedCourse.id);
                      }
                    }}
                  />
                ))}
                {filteredMaterials.length === 0 && (
                  <div className="col-span-full py-20 text-center glass rounded-2xl">
                    <p className="text-slate-400">No materials found in this category.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showLogin && (
          <Modal onClose={() => setShowLogin(false)}>
            {isAdmin ? (
              <AdminPanel 
                token={token!} 
                courses={courses} 
                onRefresh={() => { fetchCourses(); if (selectedCourse) fetchMaterials(selectedCourse.id); }} 
              />
            ) : (
              <LoginForm onSubmit={handleLogin} />
            )}
          </Modal>
        )}
      </AnimatePresence>

      <footer className="glass border-t border-white/10 p-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-sky w-6 h-6" />
            <span className="text-white font-bold">iRexihub</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 iRexihub Academic Resource Hub. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-sky transition-colors">Terms</a>
            <a href="#" className="hover:text-sky transition-colors">Privacy</a>
            <a href="#" className="hover:text-sky transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const CourseCard: React.FC<{ course: Course, onClick: () => void }> = ({ course, onClick }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="glass rounded-2xl p-6 cursor-pointer group hover:border-sky/30 transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-sky/10 rounded-xl flex items-center justify-center group-hover:bg-sky/20 transition-all">
          <BookOpen className="text-sky w-6 h-6" />
        </div>
        <span className="text-gold font-mono text-xs font-bold tracking-widest">{course.code}</span>
      </div>
      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-sky transition-colors">{course.name}</h3>
      <p className="text-slate-400 text-sm line-clamp-2">{course.description}</p>
      <div className="mt-6 flex items-center text-sky text-sm font-medium">
        View Resources <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </motion.div>
  );
}

const MaterialCard: React.FC<{ material: Material, isAdmin: boolean, onDelete: () => void }> = ({ material, isAdmin, onDelete }) => {
  const Icon = {
    pdf: FileText,
    audio: Music,
    video: Video,
    practical: ChevronRight,
    note: FileText
  }[material.type];

  const isExternal = material.url.startsWith('http');

  return (
    <div className="glass rounded-xl p-4 flex gap-4 items-start group">
      <div className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
        material.type === 'pdf' ? "bg-red-500/10 text-red-400" :
        material.type === 'video' ? "bg-purple-500/10 text-purple-400" :
        material.type === 'audio' ? "bg-emerald-500/10 text-emerald-400" :
        "bg-sky/10 text-sky"
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="text-white font-medium truncate">{material.title}</h4>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={onDelete} className="text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <a 
              href={material.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sky hover:text-white transition-colors"
            >
              {isExternal ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            </a>
          </div>
        </div>
        <p className="text-slate-400 text-xs mt-1 line-clamp-2">{material.description}</p>
        
        {material.type === 'audio' && (
          <audio controls className="w-full h-8 mt-3 opacity-60 hover:opacity-100 transition-opacity">
            <source src={material.url} type="audio/mpeg" />
          </audio>
        )}

        {material.type === 'video' && isExternal && (
          <div className="mt-3 aspect-video rounded-lg overflow-hidden bg-black/20">
            <iframe 
              src={material.url.replace('watch?v=', 'embed/')} 
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </div>
  );
}


function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
        active ? "bg-sky text-white shadow-lg shadow-sky/20" : "bg-white/5 text-slate-400 hover:bg-white/10"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl glass rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

function LoginForm({ onSubmit }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-white">Educator Login</h3>
        <p className="text-slate-400">Access your admin dashboard to manage resources.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Username</label>
          <input name="username" type="text" required className="input-field w-full" placeholder="admin" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Password</label>
          <input name="password" type="password" required className="input-field w-full" placeholder="••••••••" />
        </div>
        <button type="submit" className="btn-primary w-full py-3 text-lg mt-4">
          Login to Dashboard
        </button>
      </form>
      <p className="text-center text-xs text-slate-500">
        Demo credentials: admin / admin123
      </p>
    </div>
  );
}

function AdminPanel({ token, courses, onRefresh }: { token: string, courses: Course[], onRefresh: () => void }) {
  const [view, setView] = useState<'courses' | 'materials'>('courses');
  const [loading, setLoading] = useState(false);

  const handleAddCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      onRefresh();
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  };

  const handleAddMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });

    if (res.ok) {
      onRefresh();
      (e.target as HTMLFormElement).reset();
      alert('Material uploaded successfully!');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setView('courses')}
          className={cn("pb-2 px-4 transition-all", view === 'courses' ? "text-sky border-b-2 border-sky" : "text-slate-400")}
        >
          Manage Courses
        </button>
        <button 
          onClick={() => setView('materials')}
          className={cn("pb-2 px-4 transition-all", view === 'materials' ? "text-sky border-b-2 border-sky" : "text-slate-400")}
        >
          Upload Materials
        </button>
      </div>

      {view === 'courses' ? (
        <div className="space-y-6">
          <form onSubmit={handleAddCourse} className="space-y-4 glass p-6 rounded-2xl">
            <h4 className="text-white font-bold">Add New Course</h4>
            <div className="grid grid-cols-2 gap-4">
              <input name="code" placeholder="Course Code (e.g. CS101)" required className="input-field" />
              <input name="name" placeholder="Course Name" required className="input-field" />
            </div>
            <textarea name="description" placeholder="Description" required className="input-field w-full h-24" />
            <button disabled={loading} className="btn-primary w-full">
              {loading ? 'Adding...' : 'Add Course'}
            </button>
          </form>

          <div className="space-y-2">
            <h4 className="text-white font-bold">Existing Courses</h4>
            {courses.map(c => (
              <div key={c.id} className="flex justify-between items-center glass p-3 rounded-lg">
                <div>
                  <span className="text-gold font-mono text-xs mr-2">{c.code}</span>
                  <span className="text-white text-sm">{c.name}</span>
                </div>
                <button 
                  onClick={async () => {
                    if (confirm('Delete course and all its materials?')) {
                      await fetch(`/api/courses/${c.id}`, { 
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      onRefresh();
                    }
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleAddMaterial} className="space-y-4 glass p-6 rounded-2xl">
          <h4 className="text-white font-bold">Upload New Material</h4>
          <div className="grid grid-cols-2 gap-4">
            <select name="course_id" required className="input-field bg-navy">
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
            <select name="type" required className="input-field bg-navy">
              <option value="pdf">Lecture (PDF)</option>
              <option value="note">Note</option>
              <option value="practical">Practical</option>
              <option value="audio">Audio</option>
              <option value="video">Video Link</option>
            </select>
          </div>
          <input name="title" placeholder="Material Title" required className="input-field w-full" />
          
          <div className="space-y-2">
            <label className="text-xs text-slate-400">File Upload (PDF/Audio) OR Video URL</label>
            <input name="file" type="file" className="input-field w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky/10 file:text-sky hover:file:bg-sky/20" />
            <input name="url" placeholder="External URL (YouTube/Vimeo)" className="input-field w-full" />
          </div>

          <textarea name="description" placeholder="Description" className="input-field w-full h-24" />
          
          <button disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Uploading...' : 'Upload Resource'}
          </button>
        </form>
      )}
    </div>
  );
}

