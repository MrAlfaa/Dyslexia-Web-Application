import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ─── Stat Card Component ──────────────────────────────────────────────────────
const QuickStat = ({ label, value, icon, color }) => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-2xl shadow-lg`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <h4 className="text-2xl font-black text-slate-900 leading-none">{value}</h4>
    </div>
  </div>
);

// ─── Edit Student Modal ────────────────────────────────────────────────────────
const EditStudentModal = ({ student, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    fullName: student.fullName || "",
    age: student.age || "",
    grade: student.grade || "3",
    school: student.school || "",
    email: student.email || "",
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(student._id, formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-zoomIn">
        <div className="flex justify-between items-center p-10 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black tracking-tight">Student Profile Update</h3>
            <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Modifying Record: {student._id.slice(-8)}</p>
          </div>
          <button onClick={onClose} className="relative z-10 bg-white/10 hover:bg-white/20 transition-all p-3 rounded-2xl hover:rotate-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required
                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required
                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Age</label>
              <input type="number" name="age" value={formData.age} onChange={handleChange} required
                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Grade</label>
              <div className="relative">
                <select name="grade" value={formData.grade} onChange={handleChange}
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none appearance-none">
                  <option value="3">Grade 3</option>
                  <option value="4">Grade 4</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">School / Institution</label>
              <input type="text" name="school" value={formData.school} onChange={handleChange}
                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none" />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-8 py-5 text-xs font-black text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-95">
              Cancel
            </button>
            <button type="submit"
              className="flex-[2] px-8 py-5 text-xs font-black text-white bg-indigo-600 rounded-2xl hover:bg-slate-900 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 uppercase tracking-widest">
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── View Student Modal ────────────────────────────────────────────────────────
const ViewStudentModal = ({ student, onClose }) => (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-[4rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden animate-zoomIn border border-white/20">
      <div className="p-12 flex flex-col items-center text-center bg-slate-900 text-white relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500 rounded-full blur-[80px]"></div>
        </div>
        
        <button onClick={onClose} className="absolute top-8 right-8 text-white/30 hover:text-white transition-all hover:rotate-90">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="relative group">
          <div className="absolute inset-0 bg-indigo-500 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative w-32 h-32 bg-indigo-600 rounded-[3rem] flex items-center justify-center text-5xl font-black shadow-2xl border-4 border-white/10 mb-8 transform group-hover:scale-105 transition-transform duration-500">
            {student.fullName?.charAt(0).toUpperCase()}
          </div>
        </div>
        
        <h4 className="text-3xl font-black tracking-tighter mb-2">{student.fullName}</h4>
        <div className="px-4 py-1.5 bg-white/10 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
          STUDENT PROFILE
        </div>
      </div>

      <div className="p-12 space-y-8 bg-white">
        <div className="grid grid-cols-2 gap-5">
          {[
            { label: "Age", value: `${student.age} Years`, icon: "🎂", color: "bg-amber-50 text-amber-600" },
            { label: "Academic Level", value: `Grade ${student.grade}`, icon: "🎓", color: "bg-indigo-50 text-indigo-600" },
            { label: "School", value: student.school || "N/A", icon: "🏫", full: true, color: "bg-slate-50 text-slate-600" },
            { label: "Email Address", value: student.email, icon: "📧", full: true, color: "bg-blue-50 text-blue-600" },
          ].map(({ label, value, icon, full, color }) => (
            <div key={label} className={`${full ? "col-span-2" : ""} p-6 rounded-[2rem] border border-slate-100 flex items-start gap-4 hover:border-indigo-200 transition-colors group`}>
              <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform`}>
                {icon}
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[15px] font-black text-slate-900 leading-tight">{value}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose}
          className="w-full px-8 py-5 text-sm font-black text-white bg-slate-900 rounded-[2rem] hover:bg-indigo-600 transition-all duration-500 shadow-2xl shadow-slate-900/20 active:scale-95 uppercase tracking-[0.2em]">
          Close Profile
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const StudentProfiles = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("All");
  const [filterSchool, setFilterSchool] = useState("All");

  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isSuperAdmin = adminUser.role === "super admin";
  const token = localStorage.getItem("adminToken");

  const fetchStudents = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        // Filter out students with no grade or undefined grades if necessary
        // but user specifically said "show Grade 3 and Grade 4 as the only available grades"
        // This might mean we only want to manage/view these.
        setStudents(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleUpdate = async (id, data) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/admin/students/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Student record updated");
        setEditStudent(null);
        fetchStudents();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await axios.delete(`http://localhost:5000/api/admin/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Profile deleted successfully");
        setDeleteConfirm(null);
        fetchStudents();
      }
    } catch (error) {
      toast.error("Deletion failed");
    }
  };

  const filtered = students.filter(s => {
    const matchesSearch = 
      (s.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase());
    const matchesGrade = filterGrade === "All" || String(s.grade) === filterGrade;
    const matchesSchool = filterSchool === "All" || s.school === filterSchool;
    return matchesSearch && matchesGrade && matchesSchool;
  });

  // Specifically show only Grade 3 and Grade 4 in the stats and filters
  const gradesToDisplay = ["3", "4"];
  const availableGradesText = gradesToDisplay.map(g => `Grade ${g}`).join(", ");
  
  const uniqueSchools = [...new Set(students.map(s => s.school).filter(Boolean))];

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="w-16 h-16 border-8 border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-12 pb-24 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-black uppercase tracking-[0.3em]">
            Admin Directory
          </div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-[0.9]">
            Student <span className="text-indigo-600">Profiles</span>
          </h2>
          <p className="text-slate-500 font-bold text-xl max-w-3xl leading-relaxed">
            Manage academic records, institutional affiliations, and profile metadata for registered students in Grade 3 and 4.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-6 w-full xl:w-auto">
          <div className="relative group flex-1 sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-16 pr-8 py-5 bg-white border-2 border-slate-100 rounded-[2.25rem] text-sm font-black focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all duration-500 shadow-2xl shadow-slate-200/20"
            />
          </div>
          
          <div className="flex gap-4">
            <div className="relative group">
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="w-full sm:w-40 pl-6 pr-10 py-5 bg-white border-2 border-slate-100 rounded-[2.25rem] text-sm font-black focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all duration-500 shadow-2xl shadow-slate-200/20 appearance-none outline-none"
              >
                <option value="All">All Grades</option>
                {gradesToDisplay.map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            <div className="relative group">
              <select
                value={filterSchool}
                onChange={(e) => setFilterSchool(e.target.value)}
                className="w-full sm:w-48 pl-6 pr-10 py-5 bg-white border-2 border-slate-100 rounded-[2.25rem] text-sm font-black focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all duration-500 shadow-2xl shadow-slate-200/20 appearance-none outline-none"
              >
                <option value="All">All Schools</option>
                {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <QuickStat label="Total Profiles" value={filtered.length} icon="👥" color="bg-indigo-600 text-white" />
        <QuickStat label="Grades Available" value={availableGradesText} icon="📊" color="bg-slate-900 text-white" />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[4rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Student Name", "Email Address", "Grade", "School/Institution", "Actions"].map(h => (
                  <th key={h} className="px-10 py-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((student) => (
                <tr key={student._id} className="hover:bg-indigo-50/20 transition-all duration-300 group">
                  <td className="px-10 py-7 whitespace-nowrap">
                    <div className="flex items-center gap-6">
                      <div className="relative w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-lg group-hover:scale-110 transition-all duration-500 shadow-lg">
                        {student.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-900 leading-none mb-1 group-hover:text-indigo-600 transition-colors">{student.fullName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {student._id.slice(-8).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7 whitespace-nowrap">
                    <p className="text-sm font-black text-slate-700">{student.email}</p>
                  </td>
                  <td className="px-10 py-7 whitespace-nowrap">
                    <div className={`inline-flex items-center gap-3 px-5 py-2 rounded-2xl ${student.grade ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'bg-slate-50 border border-slate-100 text-slate-400'} text-[11px] font-black uppercase tracking-widest`}>
                      {student.grade ? `Grade ${student.grade}` : "Unassigned"}
                    </div>
                  </td>
                  <td className="px-10 py-7 whitespace-nowrap">
                    <p className="text-sm font-black text-slate-600">{student.school || "—"}</p>
                  </td>
                  <td className="px-10 py-7 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setViewStudent(student)}
                        className="w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      {isSuperAdmin && (
                        <>
                          <button onClick={() => setEditStudent(student)}
                            className="w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-amber-600 hover:border-amber-600 transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => setDeleteConfirm(student)}
                            className="w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-rose-600 hover:border-rose-600 transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center text-slate-400 font-black uppercase tracking-widest">
                    No matching student records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewStudent && <ViewStudentModal student={viewStudent} onClose={() => setViewStudent(null)} />}
      {editStudent && <EditStudentModal student={editStudent} onClose={() => setEditStudent(null)} onSave={handleUpdate} />}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg p-16 text-center animate-zoomIn overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Confirm Deletion</h3>
            <p className="text-lg font-bold text-slate-500 mb-12">
              Are you sure you want to delete <br />
              <span className="text-rose-600 font-black">{deleteConfirm.fullName}</span>?
            </p>
            <div className="flex flex-col gap-4">
              <button onClick={() => handleDelete(deleteConfirm._id)}
                className="w-full px-8 py-5 text-sm font-black text-white bg-rose-600 rounded-[2rem] hover:bg-rose-700 transition-all uppercase tracking-widest">
                Delete Permanently
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="w-full px-8 py-5 text-sm font-black text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-[2rem] transition-all uppercase tracking-widest">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfiles;
