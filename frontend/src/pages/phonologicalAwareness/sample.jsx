// function Sample() {
//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-100">
//       <h1 className="text-2xl font-bold text-green-600">
//         Phonological Awareness Page Loaded Successfully!
//       </h1>
//     </div>
//   );
// }

// export default Sample;


// import { useNavigate } from "react-router-dom";

// function Sample() {
//   const navigate = useNavigate();

//   return (
//     <div className="relative w-full h-screen overflow-hidden">
//       {/* 🌄 Background */}
//       <img
//         src="/images/phonologicalAwareness/1.png"
//         alt="background"
//         className="absolute w-full h-full object-cover"
//       />

//       {/* 🌟 LEFT CARD */}
//       <div
//         onClick={() => navigate("/science")}
//         className="absolute left-[5%] top-[35%] w-[220px] cursor-pointer hover:scale-105 transition duration-300"
//       >
//         <img
//           src="/images/phonologicalAwareness/2.jpg"
//           alt="Science"
//           className="w-full object-contain drop-shadow-xl"
//         />
//         <p className="absolute inset-0 flex items-center justify-center text-center font-bold text-lg text-purple-700 px-4">
//           The Science of Reading
//         </p>
//       </div>

//       {/* 🌟 CENTER SHOP */}
//       <div
//         onClick={() => navigate("/shop")}
//         className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[260px] cursor-pointer hover:scale-105 transition duration-300"
//       >
//         <img
//           src="/images/phonologicalAwareness/2.jpg"
//           alt="Shop"
//           className="w-full object-contain drop-shadow-2xl"
//         />

//         {/* Free Trial Label */}
//         <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 bg-pink-500 text-white font-bold px-6 py-2 rounded-xl shadow-lg">
//           Free Trial
//         </div>

//         {/* Shop Button */}
//         <div className="absolute bottom-6 w-full flex justify-center">
//           <div className="bg-blue-200 px-6 py-2 rounded-lg font-semibold shadow">
//             Shop Here
//           </div>
//         </div>
//       </div>

//       {/* 🌟 RIGHT CARD */}
//       <div
//         onClick={() => navigate("/news")}
//         className="absolute right-[5%] top-[35%] w-[220px] cursor-pointer hover:scale-105 transition duration-300"
//       >
//         <img
//           src="/images/phonologicalAwareness/2.jpg"
//           alt="News"
//           className="w-full object-contain drop-shadow-xl"
//         />
//         <p className="absolute inset-0 flex items-center justify-center font-bold text-lg text-purple-700">
//           Nessy News
//         </p>
//       </div>

//       {/* ✨ Optional Floating Animation */}
//       <style>
//         {`
//           @keyframes float {
//             0% { transform: translateY(0px); }
//             50% { transform: translateY(-10px); }
//             100% { transform: translateY(0px); }
//           }
//           .floating {
//             animation: float 3s ease-in-out infinite;
//           }
//         `}
//       </style>
//     </div>
//   );
// }

// export default Sample;


// import { useNavigate } from "react-router-dom";
// import { useRef } from "react";

// function Sample() {
//   const navigate = useNavigate();

//   // 🎵 sound
//   const clickSound = useRef(new Audio("/click.mp3"));

//   const handleClick = (path) => {
//     clickSound.current.currentTime = 0;
//     clickSound.current.play();

//     setTimeout(() => {
//       navigate(path);
//     }, 300); // wait for bounce animation
//   };

//   return (
//     <div className="relative w-full h-screen overflow-hidden">
//       {/* 🌄 Background */}
//       <img
//         src="/images/phonologicalAwareness/1.png"
//         alt="background"
//         className="absolute w-full h-full object-cover"
//       />

//       {/* 🟣 Grade 1–3 */}
//       <div
//         onClick={() => handleClick("/grade1-3")}
//         className="board left-[8%] top-[40%]"
//       >
//         <img src="/images/phonologicalAwareness/2.png" className="w-full object-contain" />
//         <p className="label text-purple-700">Grade 1 – 3</p>
//       </div>

//       {/* 🔵 Grade 4–5 */}
//       <div
//         onClick={() => handleClick("/grade4-5")}
//         className="board center"
//       >
//         <img src="/images/phonologicalAwareness/2.png" className="w-full object-contain" />
//         <p className="label text-blue-700">Grade 4 – 5</p>
//       </div>

//       {/* 🟢 Reports */}
//       <div
//         onClick={() => handleClick("/reports")}
//         className="board right-[8%] top-[40%]"
//       >
//         <img src="/images/phonologicalAwareness/2.png" className="w-full object-contain" />
//         <p className="label text-green-700">Reports</p>
//       </div>

//       {/* ✨ Styles */}
//       <style>
//         {`
//           /* 🧩 Base board */
//           .board {
//             position: absolute;
//             width: 220px;
//             cursor: pointer;
//             transition: transform 0.2s;
//           }

//           .center {
//             left: 50%;
//             top: 55%;
//             transform: translate(-50%, -50%);
//           }

//           /* 📝 Text */
//           .label {
//             position: absolute;
//             inset: 0;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             font-weight: bold;
//             font-size: 20px;
//             text-align: center;
//             padding: 0 10px;
//           }

//           /* 🎮 Hover */
//           .board:hover {
//             transform: scale(1.08);
//           }

//           /* 🎮 Bounce on click */
//           .board:active {
//             animation: bounce 0.3s;
//           }

//           @keyframes bounce {
//             0% { transform: scale(1); }
//             50% { transform: scale(0.9); }
//             100% { transform: scale(1.05); }
//           }

//           /* 🌊 Floating */
//           .board {
//             animation: float 3s ease-in-out infinite;
//           }

//           @keyframes float {
//             0% { transform: translateY(0px); }
//             50% { transform: translateY(-12px); }
//             100% { transform: translateY(0px); }
//           }

//           /* ✨ Sparkles */
//           .board::after {
//             content: "✨";
//             position: absolute;
//             top: -10px;
//             right: -10px;
//             font-size: 20px;
//             opacity: 0;
//             transform: scale(0.5);
//           }

//           .board:hover::after {
//             animation: sparkle 0.6s ease forwards;
//           }

//           @keyframes sparkle {
//             0% {
//               opacity: 0;
//               transform: scale(0.5) rotate(0deg);
//             }
//             50% {
//               opacity: 1;
//               transform: scale(1.2) rotate(20deg);
//             }
//             100% {
//               opacity: 0;
//               transform: scale(0.8) rotate(-20deg);
//             }
//           }
//         `}
//       </style>
//     </div>
//   );
// }

// export default Sample;






// import { useNavigate } from "react-router-dom";
// import { useRef } from "react";

// function Sample() {
//   const navigate = useNavigate();
//   const clickSound = useRef(new Audio("/click.mp3"));

//   const handleClick = (path) => {
//     clickSound.current.currentTime = 0;
//     clickSound.current.play();

//     setTimeout(() => {
//       navigate(path);
//     }, 300);
//   };

//   return (
//     <div className="w-full overflow-x-hidden">
//       {/* ================= HERO SECTION ================= */}
//       <div className="relative min-h-screen overflow-hidden">
//         {/* 🌄 Background */}
//         <img
//           src="/images/phonologicalAwareness/4.png"
//           alt="background"
//           className="absolute w-full h-full object-cover"
//         />

//         {/* 🟣 Grade 1–3 */}
//         <div
//           onClick={() => handleClick("/grade1-3")}
//           className="board left-[8%] top-[40%]"
//         >
//           <img src="/images/phonologicalAwareness/2.png" className="w-full object-contain" />
//           <p className="label text-purple-700">Grades 1 – 3</p>
//         </div>

//         {/* 🔵 Grade 4–5 */}
//         <div
//           onClick={() => handleClick("/grade4-5")}
//           className="board center"
//         >
//           <img src="/images/phonologicalAwareness/2.png" className="w-full object-contain" />
//           <p className="label text-blue-700">Grades 4 – 5</p>
//         </div>

//         {/* 🟢 Reports */}
//         <div
//           onClick={() => handleClick("/reports")}
//           className="board right-[8%] top-[40%]"
//         >
//           <img src="/images/phonologicalAwareness/2.png" className="w-full object-contain" />
//           <p className="label text-green-700">Reports</p>
//         </div>
//       </div>

//       {/* ================= WAVE DIVIDER ================= */}
//       <div className="relative -mt-16 z-10">
//         <svg
//           viewBox="0 0 1440 150"
//           className="w-full h-[120px] -mb-2 rotate-180 rotate-y-180"
//           preserveAspectRatio="none"
//         >
//           <path
//             fill="#67b962"
//             d="M0,64L60,74.7C120,85,240,107,360,106.7C480,107,600,85,720,80C840,75,960,85,1080,101.3C1200,117,1320,139,1380,149.3L1440,160V0H0Z"
//           ></path>
//         </svg>
//       </div>

//       {/* ================= EBOOK SECTION ================= */}
//       <div className="bg-[#67b962] text-white py-20 px-6 md:px-20">
//         <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">
//           Improve Your Spelling eBook
//         </h2>

//         <div className="flex flex-col md:flex-row items-center gap-12">
          
//           {/* 📘 Book Image */}
//           <div className="flex-1 flex justify-center">
//             <img
//               src="/images/phonologicalAwareness/ebook.png"
//               alt="ebook"
//               className="w-[280px] md:w-[400px] rounded-xl shadow-2xl border-4 border-white"
//             />
//           </div>

//           {/* 📖 Text Content */}
//           <div className="flex-1 text-center md:text-left text-lg leading-relaxed max-w-xl">
//             <p className="mb-6">
//               Improve Your Spelling, the latest book written by Nessy founder{" "}
//               <span className="font-bold italic">Mike Jones</span>, explains the
//               rules of reading and spelling. It will help teachers teach, and
//               parents to understand how to help their children.
//             </p>

//             <p className="font-bold text-xl">
//               By the end, you’ll be a master speller!
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* ================= STYLES ================= */}
//       <style>
//         {`
//           .board {
//             position: absolute;
//             width: 220px;
//             cursor: pointer;
//             transition: transform 0.2s;
//             animation: float 3s ease-in-out infinite;
//           }

//           .center {
//             left: 50%;
//             top: 55%;
//             transform: translate(-50%, -50%);
//           }

//           .label {
//             position: absolute;
//             inset: 0;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             font-weight: bold;
//             font-size: 20px;
//             text-align: center;
//           }

//           .board:hover {
//             transform: scale(1.08);
//           }

//           .board:active {
//             animation: bounce 0.3s;
//           }

//           @keyframes bounce {
//             0% { transform: scale(1); }
//             50% { transform: scale(0.9); }
//             100% { transform: scale(1.05); }
//           }

//           @keyframes float {
//             0% { transform: translateY(0px); }
//             50% { transform: translateY(-12px); }
//             100% { transform: translateY(0px); }
//           }

//           .board::after {
//             content: "✨";
//             position: absolute;
//             top: -10px;
//             right: -10px;
//             font-size: 20px;
//             opacity: 0;
//           }

//           .board:hover::after {
//             animation: sparkle 0.6s ease forwards;
//           }

//           @keyframes sparkle {
//             0% { opacity: 0; transform: scale(0.5); }
//             50% { opacity: 1; transform: scale(1.2); }
//             100% { opacity: 0; transform: scale(0.8); }
//           }
//         `}
//       </style>
//     </div>
//   );
// }

// export default Sample;




// import { useNavigate } from "react-router-dom";
// import { useRef } from "react";

// function Sample() {
//   const navigate = useNavigate();
//   const clickSound = useRef(new Audio("/click.mp3"));

//   const handleClick = (path) => {
//     clickSound.current.currentTime = 0;
//     clickSound.current.play();

//     setTimeout(() => {
//       navigate(path);
//     }, 300);
//   };

//   return (
//     <div className="w-full overflow-x-hidden">
//       {/* ================= HERO SECTION ================= */}
//       <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        
//         {/* 🌄 Background */}
//         <img
//           src="/images/phonologicalAwareness/4.png"
//           alt="background"
//           className="absolute w-full h-full object-cover"
//         />

//         {/* 🧩 Boards Container */}
//         {/* <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-20 w-full max-w-5xl border border-red-500"> */}
//         <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20 w-full max-w-6xl px-4 border border-red-500">
          
//           {/* 🟣 Grades 1–3 */}
//           <div
//             onClick={() => handleClick("/phonological-awareness/identification/grade1-3")}
//             className="board-responsive border border-red-500"
//           >
//             <img
//               src="/images/phonologicalAwareness/5.png"
//               className="w-full object-contain"
//             />
//             <p className="label text-black-700">Identification (Grades 1 - 3)</p>
//           </div>

//           {/* 🔵 Grades 4–5 */}
//           <div
//             onClick={() => handleClick("/phonological-awareness/identification/grade4-5")}
//             className="board-responsive"
//           >
//             <img
//               src="/images/phonologicalAwareness/6.png"
//               className="w-full object-contain"
//             />
//             <p className="label text-black-700">Identification (Grades 4 – 5)</p>
//           </div>

//         </div>
//       </div>

//       {/* ================= WAVE DIVIDER ================= */}
//       <div className="relative -mt-20 z-10">
//         <svg
//           viewBox="0 0 1440 150"
//           className="w-full h-[120px] scale-y-[-1]"
//           preserveAspectRatio="none"
//         >
//           <path
//             fill="#67b962"
//             d="M0,64L60,74.7C120,85,240,107,360,106.7C480,107,600,85,720,80C840,75,960,85,1080,101.3C1200,117,1320,139,1380,149.3L1440,160V0H0Z"
//           />
//         </svg>
//       </div>

//       {/* ================= EBOOK SECTION ================= */}
//       <div className="bg-[#67b962] text-white py-20 px-6 md:px-20">
//         <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">
//           Improve Your Spelling eBook
//         </h2>

//         <div className="flex flex-col md:flex-row items-center gap-12">
          
//           {/* 📘 Book Image */}
//           <div className="flex-1 flex justify-center">
//             <img
//               src="/images/phonologicalAwareness/ebook.png"
//               alt="ebook"
//               className="w-[260px] sm:w-[320px] md:w-[400px] rounded-xl shadow-2xl border-4 border-white"
//             />
//           </div>

//           {/* 📖 Text Content */}
//           <div className="flex-1 text-center md:text-left text-lg leading-relaxed max-w-xl">
//             <p className="mb-6">
//               Improve Your Spelling, the latest book written by Nessy founder{" "}
//               <span className="font-bold italic">Mike Jones</span>, explains the
//               rules of reading and spelling. It will help teachers teach, and
//               parents to understand how to help their children.
//             </p>

//             <p className="font-bold text-xl">
//               By the end, you’ll be a master speller!
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* ================= STYLES ================= */}
//       <style>
//         {`
//           /* 🧩 Responsive board */
//           .board-responsive {
//             position: relative;
//             width: 360px;
//             cursor: pointer;
//             transition: transform 0.2s;
//             animation: float 3s ease-in-out infinite;
//           }

//           @media (min-width: 768px) {
//             .board-responsive {
//               width: 204px;
//             }
//           }

//           /* 📝 Text */
//           .label {
//             position: absolute;
//             inset: 0;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             font-weight: bold;
//             font-size: 18px;
//             text-align: center;
//             padding: 0 10px;
//           }

//           @media (min-width: 768px) {
//             .label {
//               font-size: 22px;
//             }
//           }

//           /* 🎮 Hover */
//           .board-responsive:hover {
//             transform: scale(1.08);
//           }

//           /* 🎮 Bounce */
//           .board-responsive:active {
//             animation: bounce 0.3s;
//           }

//           @keyframes bounce {
//             0% { transform: scale(1); }
//             50% { transform: scale(0.9); }
//             100% { transform: scale(1.05); }
//           }

//           /* 🌊 Floating */
//           @keyframes float {
//             0% { transform: translateY(0px); }
//             50% { transform: translateY(-12px); }
//             100% { transform: translateY(0px); }
//           }

//           /* ✨ Sparkle */
//           .board-responsive::after {
//             content: "✨";
//             position: absolute;
//             top: -10px;
//             right: -10px;
//             font-size: 20px;
//             opacity: 0;
//           }

//           .board-responsive:hover::after {
//             animation: sparkle 0.6s ease forwards;
//           }

//           @keyframes sparkle {
//             0% { opacity: 0; transform: scale(0.5); }
//             50% { opacity: 1; transform: scale(1.2); }
//             100% { opacity: 0; transform: scale(0.8); }
//           }
//         `}
//       </style>
//     </div>
//   );
// }

// export default Sample;


import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import { getStudentProfile } from "../../services/student/api";

function Sample() {
  const navigate = useNavigate();
  const { t } = useTranslation('pa');
  const clickSound = useRef(new Audio("/click.mp3"));
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getStudentProfile();
      setProfile(res.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleClick = (path) => {
    clickSound.current.currentTime = 0;
    clickSound.current.play();

    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  return (
    <div className="w-full overflow-x-hidden">

      {/* ================= HERO ================= */}
      <div className="relative min-h-screen flex items-center justify-center">

        {/* Background */}
        <img
          src="/images/phonologicalAwareness/8.png"
          alt="background"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Overlay (better readability) */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Language Switcher */}
        <div className="absolute top-8 right-8 z-20">
          <LanguageSwitcher />
        </div>

        {/* Cards Grid */}
        <div className="relative z-10 w-full max-w-6xl px-6 flex justify-center">

          {profile && (
            <div
              onClick={() => handleClick(`/identificationActivities-pa/${profile.grade}`)}
              className="relative w-[280px] md:w-[360px] cursor-pointer transform transition-all duration-300 hover:scale-110 active:scale-95"
            >
              {/* Card Image */}
              <img
                src="/images/phonologicalAwareness/7.png"
                alt={t("identification")}
                className="w-full h-auto object-contain drop-shadow-2xl"
              />

              {/* Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <p className="text-white font-black text-center text-xl md:text-2xl drop-shadow-lg">
                  {t("common:grade")} {profile.grade}<br/>
                  {t("common:identification")}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ================= WAVE ================= */}
      <div className="relative -mt-16">
        <svg
          viewBox="0 0 1440 150"
          className="w-full h-[120px] scale-y-[-1]"
          preserveAspectRatio="none"
        >
          <path
            fill="#67b962"
            d="M0,64L60,74.7C120,85,240,107,360,106.7C480,107,600,85,720,80C840,75,960,85,1080,101.3C1200,117,1320,139,1380,149.3L1440,160V0H0Z"
          />
        </svg>
      </div>

      {/* ================= EBOOK ================= */}
      <div className="bg-[#67b962] text-white py-20 px-6 md:px-20">
        <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">
          {t("improve_spelling_ebook")}
        </h2>

        <div className="flex flex-col md:flex-row items-center gap-12 max-w-6xl mx-auto">

          <div className="flex-1 flex justify-center">
            <img
              src="/images/phonologicalAwareness/ebook.png"
              className="w-[260px] sm:w-[320px] md:w-[400px] rounded-xl shadow-2xl border-4 border-white"
            />
          </div>

          <div className="flex-1 text-center md:text-left text-lg leading-relaxed">
            <p className="mb-6">
              {t("ebook_desc")}
            </p>

            <p className="font-bold text-xl">
              {t("master_speller")}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Sample;