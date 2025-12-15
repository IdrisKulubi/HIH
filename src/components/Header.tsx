"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, FileText, LogIn } from "lucide-react";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { data: session, status } = useSession();

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Scroll detection for hide/show header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show header when scrolling up or at top, hide when scrolling down
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/#faq", label: "FAQs" },
  ];

  return (
    <>
      <motion.header
        className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100"
        initial={{ y: -100 }}
        animate={{ y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="w-full px-4 lg:px-8">
          <div className="flex items-center justify-between py-1.5 lg:py-2">
            {/* Left: Partner Logos - pushed to far left */}
            <motion.div
              className="flex items-center gap-2 lg:gap-3"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              {/* Hand in Hand Logo - Reduced size */}
              <Link href="/" className="relative h-8 w-28 lg:h-10 lg:w-32">
                <Image
                  src="/logos/hand.png"
                  alt="Hand in Hand Eastern Africa"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </Link>

              <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

              {/* Embassy of Sweden Logo - Reduced size */}
              <div className="hidden sm:block relative h-8 w-24 lg:h-10 lg:w-28">
                <Image
                  src="/logos/sweden.png"
                  alt="Embassy of Sweden Nairobi"
                  fill
                  className="object-contain object-left"
                />
              </div>

              {/* Hand in Hand Sweden Logo - Made larger */}
              <div className="hidden sm:block relative h-8 w-24 lg:h-10 lg:w-28">
                <Image
                  src="/logos/hand-sweden.png"
                  alt="Hand in Hand Sweden"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </motion.div>

            {/* Center: Title removed per user edit */}

            {/* Right: Desktop Navigation */}
            <motion.nav
              className="hidden lg:flex items-center gap-6"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium px-3 py-2 rounded-lg text-slate-600 hover:text-[#005EB8] hover:bg-blue-50 transition-colors"
                >
                  {link.label}
                </Link>
              ))}

             

              {/* Authentication Section */}
              {status === "loading" ? (
                <div className="h-10 w-20 bg-gray-200 animate-pulse rounded-full" />
              ) : session?.user ? (
                // User is signed in - show user dropdown
                (<DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 p-2 rounded-full hover:bg-blue-50 transition-all duration-300 border border-transparent hover:border-blue-100">
                      <Avatar className="h-9 w-9 border-2 border-[#005EB8]/20">
                        <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                        <AvatarFallback className="bg-[#005EB8] text-white text-sm font-semibold">
                          {session.user.name?.[0] || session.user.email?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-slate-700 hidden xl:block pr-2">
                        {session.user.name || "User"}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session.user.name || "User"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=application" className="flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>My Application</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>)
              ) : (
                // User is not signed in - show sign in button
                <div className="flex items-center gap-3">
                  <Link
                    href="/login?tab=signin"
                    className="text-sm font-semibold text-gray-600 hover:text-[#005EB8]"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/login?tab=signup"
                    className="px-5 py-2.5 rounded-full font-bold text-sm bg-brand-blue text-white hover:bg-brand-blue/90 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Apply Now
                  </Link>
                </div>
              )}
            </motion.nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 sm:p-3 rounded-xl transition-all duration-300 relative z-50 text-slate-600 hover:bg-blue-50 hover:text-[#005EB8]"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 relative">
                <span className={`absolute w-full h-0.5 bg-current transform transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'}`} />
                <span className={`absolute w-full h-0.5 bg-current transform transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
                <span className={`absolute w-full h-0.5 bg-current transform transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'}`} />
              </div>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={closeMobileMenu}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 border-l border-gray-100"
            >
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-gray-100 bg-[#005EB8]">
                  <h2 className="text-xl font-bold text-white">BIRE Portal</h2>
                  <p className="text-blue-100 text-sm mt-1">Building Inclusive & Resilient Enterprises</p>
                </div>

                {/* User Section in Mobile Menu */}
                {session?.user && (
                  <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                        <AvatarFallback className="bg-[#005EB8] text-white font-semibold">
                          {session.user.name?.[0] || session.user.email?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900 line-clamp-1">{session.user.name || "User"}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{session.user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 p-6 space-y-2 overflow-y-auto">
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Menu</h3>
                    {navLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-all duration-300 group"
                      >
                        <span className="text-gray-700 font-medium group-hover:text-[#005EB8] transition-colors">
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100">
                  {session?.user ? (
                    <Button
                      onClick={() => {
                        closeMobileMenu();
                        handleSignOut();
                      }}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-3 py-6 px-6 text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Sign Out</span>
                    </Button>
                  ) : (
                    <>
                      <Link
                        href="/login?tab=signin"
                        onClick={closeMobileMenu}
                        className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300 mb-3"
                      >
                        <LogIn className="w-5 h-5" />
                        <span>Log In</span>
                      </Link>
                      <Link
                        href="/login?tab=signup"
                        onClick={closeMobileMenu}
                        className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-[#005EB8] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-[#004a91] transition-all duration-300"
                      >
                        <span>Apply Today</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
} 