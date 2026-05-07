import { useNavigate } from "react-router-dom";
import { useRef } from "react";

function Sample() {
  const navigate = useNavigate();
  const clickSound = useRef(new Audio("/click.mp3"));

  const handleClick = (path) => {
    clickSound.current.currentTime = 0;
    clickSound.current.play();

    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  const cards = [
    {
      title: "Working Memory Identification (Grades 1 - 3)",
      image: "/images/workingMemory/7.png",
      path: "/working-memory/1-3", // ✅ UPDATED
    },
    {
      title: "Working Memory Identification (Grades 4 - 5)",
      image: "/images/workingMemory/7.png",
      path: "/working-memory/4-5", // ✅ UPDATED
    },
  ];

  return (
    <div className="w-full overflow-x-hidden">

      {/* ================= HERO ================= */}
      <div className="relative min-h-screen flex items-center justify-center">

        {/* Background */}
        <img
          src="/images/workingMemory/8.png"
          alt="background"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Cards Grid */}
        <div className="relative z-10 w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-2 gap-10 place-items-center">

          {cards.map((card, index) => (
            <div
              key={index}
              onClick={() => handleClick(card.path)}
              className="relative w-[280px] md:w-[360px] cursor-pointer transform transition-all duration-300 hover:scale-110 active:scale-95"
            >
              {/* Card Image */}
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-auto object-contain drop-shadow-2xl"
              />

              {/* Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <p className="text-white font-bold text-center text-lg md:text-xl">
                  {card.title}
                </p>
              </div>
            </div>
          ))}

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
          Improve Your Memory Skills eBook
        </h2>

        <div className="flex flex-col md:flex-row items-center gap-12 max-w-6xl mx-auto">

          <div className="flex-1 flex justify-center">
            <img
              src="/images/workingMemory/ebook.png"
              alt="ebook"
              className="w-[260px] sm:w-[320px] md:w-[400px] rounded-xl shadow-2xl border-4 border-white"
            />
          </div>

          <div className="flex-1 text-center md:text-left text-lg leading-relaxed">
            <p className="mb-6">
              Strengthen your working memory with guided exercises and practical strategies.
            </p>

            <p className="font-bold text-xl">
              Train your brain to remember better and learn faster!
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Sample;