import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Edit3, User, Code, FileCode, Shield, PieChart, Lightbulb, CheckCircle } from "lucide-react";
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
            <a href="#applications" className="text-sm font-medium hover:text-primary">Applications</a>
            <a href="#educators" className="text-sm font-medium hover:text-primary">For Educators</a>
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
                Keystroke Analysis for AI Content Detection
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                WriteTrack uses advanced analysis of keystroke patterns to detect AI-generated content in essays, with plans to expand into code and mathematical equations—providing educators with powerful tools to ensure academic integrity.
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
              WriteTrack offers sophisticated keystroke analysis across multiple content creation environments
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Edit3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Domain Editors</h3>
              <p className="text-muted-foreground">
                Specialized editors for essays, code, and mathematical equations, each with domain-specific features.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <PieChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Advanced AI Detection</h3>
              <p className="text-muted-foreground">
                Sophisticated analysis of typing patterns, pauses, edits, and revisions to identify AI-generated content.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Citation & Source Controls</h3>
              <p className="text-muted-foreground">
                Advanced copy-paste tracking and citation management across different domains for academic integrity.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Simple Authentication</h3>
              <p className="text-muted-foreground">
                Easy access for students with streamlined authentication, while educators enjoy secure institutional login.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pattern Analysis</h3>
              <p className="text-muted-foreground">
                Machine learning algorithms that learn and adapt to individual typing patterns for higher accuracy.
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <FileCode className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Comprehensive Dashboard</h3>
              <p className="text-muted-foreground">
                Detailed analytics on student work across different domains with visual indicators of potential AI usage.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Applications Section */}
      <section id="applications" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Applications</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              WriteTrack adapts to different educational contexts with specialized environments — with more to come
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Essay Writing */}
            <div className="bg-white p-6 rounded-lg shadow-sm border relative">
              <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                Available Now
              </div>
              <div className="bg-blue-100 text-blue-700 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Edit3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Essay Writing</h3>
              <p className="text-muted-foreground mb-4">
                A distraction-free writing environment with integrated rubrics and citation tools for humanities and social sciences.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Real-time keystroke analysis</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Citation management</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Detailed revision history</span>
                </li>
              </ul>
            </div>
            
            {/* Code Editor */}
            <div className="bg-white p-6 rounded-lg shadow-sm border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 bg-blue-500 text-white text-center py-1 rotate-45 translate-y-3 translate-x-8 text-xs font-semibold shadow-md">
                Coming Soon
              </div>
              <div className="bg-purple-100 text-purple-700 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Code className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Code Editor</h3>
              <p className="text-muted-foreground mb-4">
                Specialized IDE with language support, syntax highlighting, and unique keystroke pattern analysis for computer science courses.
              </p>
              <ul className="space-y-2 text-sm opacity-75">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Code-specific pattern detection</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Multi-language support</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Plagiarism detection</span>
                </li>
              </ul>
            </div>
            
            {/* LaTeX Editor */}
            <div className="bg-white p-6 rounded-lg shadow-sm border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 bg-blue-500 text-white text-center py-1 rotate-45 translate-y-3 translate-x-8 text-xs font-semibold shadow-md">
                Coming Soon
              </div>
              <div className="bg-green-100 text-green-700 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <FileCode className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">LaTeX Editor</h3>
              <p className="text-muted-foreground mb-4">
                Mathematical equation editor with LaTeX support for STEM courses, including specialized analysis of equation entry patterns.
              </p>
              <ul className="space-y-2 text-sm opacity-75">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span>LaTeX syntax support</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Equation pattern analysis</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Real-time rendering</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              Our roadmap includes expanding WriteTrack's capabilities to cover more educational contexts. 
              <br />Want to be notified when new editors are released? <a href="/auth?tab=register" className="text-primary hover:underline">Sign up for updates</a>.
            </p>
          </div>
        </div>
      </section>
      
      {/* For Educators Section */}
      <section id="educators" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">For Educators</h2>
              <p className="text-lg mb-6">
                WriteTrack provides educators with powerful tools to detect AI-generated content in essays now, with code and mathematical content support coming soon—helping maintain academic integrity in the age of generative AI.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Comprehensive dashboard with detailed keystroke analytics</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Essay content analysis with AI detection capabilities</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Visual timeline of student work with anomaly highlighting</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Configurable detection sensitivity for different assignments</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Integrated grading and feedback tools</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-100 p-8 rounded-lg flex justify-center items-center">
              <img 
                src="/teacher-dashboard.png" 
                alt="Educator Dashboard" 
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
      <section id="students" className="py-20">
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
                Students benefit from our essay writing environment today, with specialized tools for different subjects coming soon to help them demonstrate their authentic work and understanding.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Distraction-free essay writing environment</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Proper citation and reference management tools</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Intuitive interface with focused writing features</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Calendar system for tracking assignments across all courses</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Simple login and seamless submission process</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Ensure Academic Integrity?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join WriteTrack today to detect AI-generated essays with our advanced keystroke analysis, and be first to access our code and LaTeX editors when they launch.
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
                Advanced keystroke analysis for detecting AI-generated content in essays, with upcoming support for code and mathematical equations, helping educators maintain academic integrity.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#applications" className="hover:text-white transition-colors">Applications</a></li>
                <li><a href="#educators" className="hover:text-white transition-colors">For Educators</a></li>
                <li><a href="#students" className="hover:text-white transition-colors">For Students</a></li>
                <li><Link href="/auth" className="hover:text-white transition-colors">Login / Register</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li>Email: info@writetrack.edu</li>
                <li>Phone: (555) 123-4567</li>
                <li>Address: 123 Innovation Ave, Tech City</li>
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