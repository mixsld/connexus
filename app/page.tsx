import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-white dark:bg-gray-950">
      {/* Premium gold: #D4A853 with soft gradients */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6"
      >
        <div
          className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#D4A853] to-[#F3D38E] opacity-10"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-20 pb-10 lg:flex lg:items-center lg:gap-x-12 lg:px-8 lg:pt-28">
        {/* Left column – text */}
        <div className="max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl">
          <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <span className="mr-2 flex h-2 w-2 rounded-full bg-[#D4A853]"></span>
            Now matching Thomasians across 18+ colleges
          </div>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            Build{" "}
            <span className="bg-gradient-to-r from-[#D4A853] to-[#F3D38E] bg-clip-text text-transparent">
              together
            </span>
            , beyond your college.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Connexus uses AI to match you with students across UST based on
            skills, interests, and project needs — no more cold DMs or silent
            Facebook groups.
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#D4A853] px-8 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#B8903E] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
            >
              Get started free
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5 10a.75.75 0 0 1 .75-.75h6.638L9.72 6.58a.75.75 0 0 1 1.06-1.06l3.97 3.97a.75.75 0 0 1 0 1.06l-3.97 3.97a.75.75 0 0 1-1.06-1.06l2.668-2.668H5.75A.75.75 0 0 1 5 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center rounded-full border border-gray-300 bg-white px-8 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
            >
              Sign in
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="block text-2xl font-bold text-gray-900 dark:text-white">
                40k+
              </span>
              Thomasians
            </div>
            <div>
              <span className="block text-2xl font-bold text-gray-900 dark:text-white">
                18+
              </span>
              Colleges
            </div>
            <div>
              <span className="block text-2xl font-bold text-gray-900 dark:text-white">
                AI‑driven
              </span>
              matching
            </div>
          </div>
        </div>

        {/* Right column – visual illustration */}
        <div className="mt-14 flex justify-center lg:mt-0 lg:flex-1 lg:pl-8">
          <div className="relative w-full max-w-md lg:max-w-none">
            {/* Soft backdrop card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-50 to-white p-6 shadow-xl ring-1 ring-gray-200/60 dark:from-gray-900 dark:to-gray-950 dark:ring-gray-800/60">
              {/* Decorative gradient blobs behind cards */}
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#D4A853]/10 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-[#D4A853]/5 blur-2xl" />

              <div className="relative space-y-4">
                {/* Match card 1 */}
                <div className="flex items-center gap-4 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-gray-100 backdrop-blur dark:bg-gray-800/90 dark:ring-gray-700">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4A853]/10 dark:bg-[#D4A853]/20">
                    <span className="text-lg font-bold text-[#D4A853]">CS</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Justin, BS Computer Science
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      React · Python · Health‑Tech
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    89% match
                  </span>
                </div>

                {/* Match card 2 */}
                <div className="flex items-center gap-4 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-gray-100 backdrop-blur dark:bg-gray-800/90 dark:ring-gray-700">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4A853]/10 dark:bg-[#D4A853]/20">
                    <span className="text-lg font-bold text-[#D4A853]">MD</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Ana, Doctor of Medicine
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Clinical Research · Python
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    89% match
                  </span>
                </div>

                {/* Connecting swoosh */}
                <svg
                  className="absolute -right-6 top-8 -z-10 h-48 w-48 text-[#D4A853]/20 dark:text-[#D4A853]/30"
                  viewBox="0 0 200 200"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 6"
                >
                  <path d="M40 30C40 30 10 80 70 110C130 140 100 180 160 190" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature section — separate from hero, clearly visible */}
      <div className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "AI‑powered matching",
              desc: "Our engine scores candidates by skills, interests, and cross‑college diversity.",
              icon: (
                <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
              ),
            },
            {
              title: "Real‑time chat",
              desc: "When you match, a conversation opens instantly — no third‑party tools needed.",
              icon: (
                <path
                  fillRule="evenodd"
                  d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z"
                  clipRule="evenodd"
                />
              ),
            },
            {
              title: "Project board",
              desc: "Post an idea and watch the AI surface the best teammates from across UST.",
              icon: (
                <path
                  fillRule="evenodd"
                  d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10.75a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM6 16.75a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM3 4.75a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-1.5 0v-.01A.75.75 0 0 1 3 4.75ZM3 10.75a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-1.5 0v-.01a.75.75 0 0 1 .75-.75ZM3 16.75a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-1.5 0v-.01a.75.75 0 0 1 .75-.75Z"
                  clipRule="evenodd"
                />
              ),
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-[#D4A853]/30 dark:border-gray-800/60 dark:bg-gray-900 dark:hover:border-[#D4A853]/30"
            >
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#D4A853]/10 text-[#D4A853] dark:bg-[#D4A853]/20">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {feature.icon}
                </svg>
              </span>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}