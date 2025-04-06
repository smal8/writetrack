import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Edit3, User, BookOpen, PieChart, Shield, Users, Layers, CheckCircle } from "lucide-react";
import { WaveAnimation } from "@/components/wave-animation";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Navigation */}
      <header className={`sticky top-0 z-50 w-full border-b transition-all duration-200 ${
        scrolled ? "bg-white/95 backdrop-blur-sm" : "bg-white"
      }`}>
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="WriteTrack Logo" className="h-10 w-10" />
            <span className="text-xl font-bold">WriteTrack</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium hover:text-primary">Features</a>
            <a href="#teachers" className="text-sm font-medium hover:text-primary">For Teachers</a>
            <a href="#students" className="text-sm font-medium hover:text-primary">For Students</a>
          </nav>
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/auth?tab=login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth?tab=register">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <WaveAnimation />
        <div className="container relative z-10 mx-auto px-4 py-20 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Enhance Essay Writing and Detect AI Content
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                The WriteTrack platform is designed to enhance the essay-writing experience for students while providing teachers with valuable insights into student progress and potential AI-generated content.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg">
                  <Link href="/auth?tab=register">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#features">Learn More</a>
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <img 
                src="/editor-preview.png" 
                alt="WriteTrack Editor" 
                className="rounded-lg shadow-xl max-w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder-editor.svg";
                }}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Key Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              WriteTrack offers a comprehensive solution for essay writing, grading, and AI detection
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Edit3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Distraction-Free Editor</h3>
              <p className="text-muted-foreground">
                A minimalist writing environment that helps students focus on content creation without distractions.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Simple Authentication</h3>
              <p className="text-muted-foreground">
                Students can log in with just their student ID, while teachers access a secure portal with school credentials.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Integrated Rubrics</h3>
              <p className="text-muted-foreground">
                Students can view grading rubrics while writing, ensuring they understand expectations and requirements.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <PieChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Detection</h3>
              <p className="text-muted-foreground">
                Sophisticated keystroke analysis helps identify potential AI-generated content for educational integrity.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Citation Controls</h3>
              <p className="text-muted-foreground">
                Controlled copy-paste feature for quotes requires teacher approval, promoting proper citation practices.
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Comprehensive Dashboard</h3>
              <p className="text-muted-foreground">
                Teachers can view all classes, assignments, and detailed analytics on student writing patterns.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* For Teachers Section */}
      <section id="teachers" className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">For Teachers</h2>
              <p className="text-lg mb-6">
                The teacher view of WriteTrack is designed to provide a comprehensive dashboard that displays all their classes and corresponding student assignments.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Secure authentication with school email and password</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Detailed breakdown of student essays including submission dates and grades</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>AI-detection insights based on real-time keystroke tracking</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Timeline analysis showing when students logged in, began writing, and completed essays</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Monitor and approve student citations for academic integrity</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-100 p-8 rounded-lg flex justify-center items-center">
              <img 
                src="/teacher-dashboard.png" 
                alt="Teacher Dashboard" 
                className="rounded shadow-lg max-w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder-dashboard.svg";
                }}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* For Students Section */}
      <section id="students" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-gray-100 p-8 rounded-lg flex justify-center items-center">
              <img 
                src="/student-editor.png" 
                alt="Student Editor" 
                className="rounded shadow-lg max-w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder-editor.svg";
                }}
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold mb-6">For Students</h2>
              <p className="text-lg mb-6">
                Students enjoy a streamlined, focused writing experience that helps them produce their best work while maintaining academic integrity.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Simple login with student ID for quick access</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Distraction-free text editor focused on content creation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Split-screen view with writing area and grading rubric</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Specialized citation box for properly referencing external sources</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Calendar view to track assignment due dates and completion status</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join WriteTrack today and transform the way you write, teach, and learn.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="/auth?tab=login">Log In</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-white hover:bg-white/10">
              <Link href="/auth?tab=register">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.svg" alt="WriteTrack Logo" className="h-8 w-8" />
                <span className="text-xl font-bold text-white">WriteTrack</span>
              </div>
              <p className="max-w-md">
                Enhancing the essay-writing experience for students while providing teachers with valuable insights into student progress.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#teachers" className="hover:text-white transition-colors">For Teachers</a></li>
                <li><a href="#students" className="hover:text-white transition-colors">For Students</a></li>
                <li><Link href="/auth" className="hover:text-white transition-colors">Login / Register</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li>Email: info@writetrack.edu</li>
                <li>Phone: (555) 123-4567</li>
                <li>Address: 123 Education Ave, Learning City</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-6 text-center">
            <p>&copy; {new Date().getFullYear()} WriteTrack. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 