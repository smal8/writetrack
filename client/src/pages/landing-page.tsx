import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Edit3, User, Code, FileCode, Shield, PieChart, Lightbulb, CheckCircle, Building, GraduationCap, Users, Briefcase } from "lucide-react";
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
            <img src="/logo.svg" alt="Rawk Logo" className="h-10 w-10" />
            <span className="text-xl font-bold">Rawk</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium hover:text-primary">Features</a>
            <a href="#approach" className="text-sm font-medium hover:text-primary">Our Approach</a>
            <a href="#organizations" className="text-sm font-medium hover:text-primary">For Organizations</a>
            <a href="#learners" className="text-sm font-medium hover:text-primary">For Learners</a>
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
                Ensuring Real Learning in the Age of AI
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Transform AI interactions into meaningful learning experiences across schools, government agencies, corporate training, and bootcamps. Rawk helps organizations verify authentic learning while empowering learners to prove genuine understanding.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg">
                  <Link href="/auth?tab=register">
                    Start Learning <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#approach">Learn More</a>
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <img 
                src="/editor-preview.png" 
                alt="Rawk Editor" 
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
      
      {/* Our Approach Section */}
      <section id="approach" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Our Three-Pillar Approach</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              To maintain authentic learning while embracing AI's power, we pursue a comprehensive strategy that benefits all learning environments
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="bg-blue-500/10 w-16 h-16 flex items-center justify-center rounded-full mb-6 mx-auto">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">Better Detection of AI-Generated Work</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>For Institutions:</strong> Advanced detection tools that flag AI-generated text without penalizing legitimate use</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>For Trainers:</strong> Recognition training for AI-assisted work and assignment design for original thinking</span>
                </li>
              </ul>
            </div>
            
            {/* Pillar 2 */}
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="bg-green-500/10 w-16 h-16 flex items-center justify-center rounded-full mb-6 mx-auto">
                <Lightbulb className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">Integrate LLMs as Learning Partners</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Education:</strong> Personalized instruction and problem-solving guidance</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Corporate:</strong> Interactive training for debugging, reporting, and communication</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Government:</strong> Upskilling tools for policy research and citizen service</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Bootcamps:</strong> AI tutors with human-led evaluation checkpoints</span>
                </li>
              </ul>
            </div>
            
            {/* Pillar 3 */}
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="bg-purple-500/10 w-16 h-16 flex items-center justify-center rounded-full mb-6 mx-auto">
                <Building className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">Policy and Infrastructure Support</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Standards for ethical AI use in learning environments</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Research funding for effective human-AI collaboration</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Public-private partnerships for open AI instructional tools</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Learning Verification Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools that ensure genuine learning across all educational and training environments
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Edit3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Learning Environments</h3>
              <p className="text-muted-foreground">
                Specialized environments tailored for different learning contexts—from academic essays to professional documentation and policy analysis.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <PieChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Learning Process Analytics</h3>
              <p className="text-muted-foreground">
                Intelligent analysis that reveals authentic learning patterns across educational institutions, corporate training, and professional development programs.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Learning Integration</h3>
              <p className="text-muted-foreground">
                Transform AI tool usage into verifiable learning experiences, ensuring learners understand concepts rather than just copying outputs.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Cross-Sector Insights</h3>
              <p className="text-muted-foreground">
                Learners gain self-awareness while instructors, trainers, and managers get visibility into genuine skill development and knowledge retention.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Adaptive Learning Questions</h3>
              <p className="text-muted-foreground">
                Context-aware prompts that help learners reflect on understanding while providing evidence of genuine thinking processes to instructors.
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <FileCode className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Comprehensive Learning Evidence</h3>
              <p className="text-muted-foreground">
                Detailed documentation of learning journeys that learners can review and organizations can use to assess authentic skill development.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Applications Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Learning Environments Across Sectors</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Rawk adapts to diverse learning contexts with specialized environments that enhance understanding across education, government, corporate training, and professional development
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Academic Environment */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-blue-100 text-blue-700 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Academic Learning</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Essay writing, research papers, and STEM problem-solving with integrated citation tools and rubrics.
              </p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Real-time keystroke analysis</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Citation management</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Detailed revision history</span>
                </li>
              </ul>
            </div>
            
            {/* Corporate Training */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-green-100 text-green-700 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Corporate Training</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Professional documentation, code reviews, and business communication with skill verification.
              </p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Performance analytics</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Skill progression tracking</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Team collaboration insights</span>
                </li>
              </ul>
            </div>
            
            {/* Government Training */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-purple-100 text-purple-700 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Building className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Government Training</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Policy analysis, legal research, and public service documentation with compliance tracking.
              </p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Compliance verification</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Policy research tools</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Audit trail documentation</span>
                </li>
              </ul>
            </div>
            
            {/* Bootcamp Training */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="bg-orange-100 text-orange-700 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <Code className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Bootcamp Training</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Intensive coding, design, and technical skill development with AI tutoring and checkpoints.
              </p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>AI tutor integration</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Competency validation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Project-based assessment</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* For Organizations Section */}
      <section id="organizations" className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">For Organizations</h2>
              <p className="text-lg mb-6">
                Whether you're running a school, government agency, corporate training program, or bootcamp, Rawk helps you verify that authentic learning is happening and skill development is genuine.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Verify authentic skill development through comprehensive process analysis</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>See evidence of learner thinking patterns and knowledge retention</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Distinguish between learning from AI and copying from AI</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Review learner reflection data to assess genuine comprehension</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Support learners who need help transforming AI use into real skill building</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-100 p-8 rounded-lg flex justify-center items-center">
              <img 
                src="/teacher-dashboard.png" 
                alt="Organization Dashboard" 
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
      
      {/* For Learners Section */}
      <section id="learners" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-gray-100 p-8 rounded-lg flex justify-center items-center">
              <img 
                src="/student-editor.png" 
                alt="Learner Interface" 
                className="rounded shadow-lg max-w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder-editor.svg";
                }}
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold mb-6">For Learners</h2>
              <p className="text-lg mb-6">
                Whether you're a student, professional, public servant, or career changer, Rawk helps you ensure you're truly learning and building real skills, not just completing tasks.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Verify your own understanding through guided reflection and self-assessment</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Transform AI assistance into genuine skill-building rather than passive copying</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Get insights into your learning process and identify areas for improvement</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Build confidence by demonstrating authentic competency to supervisors and instructors</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Develop transferable learning habits that serve you across career transitions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Ensure Real Learning?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
            Join organizations across sectors using Rawk to verify authentic learning and skill development. Help learners prove their competency while empowering instructors to validate genuine understanding.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="/auth?tab=login">Log In</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-white hover:bg-white/10">
              <Link href="/auth?tab=register">Start Learning</Link>
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
                <img src="/logo.svg" alt="Rawk Logo" className="h-8 w-8" />
                <span className="text-xl font-bold text-white">Rawk</span>
              </div>
              <p className="max-w-md">
                A learning verification platform that helps organizations across sectors ensure authentic learning and skill development while empowering learners to prove genuine understanding in the age of AI.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#approach" className="hover:text-white transition-colors">Our Approach</a></li>
                <li><a href="#organizations" className="hover:text-white transition-colors">For Organizations</a></li>
                <li><a href="#learners" className="hover:text-white transition-colors">For Learners</a></li>
                <li><Link href="/auth" className="hover:text-white transition-colors">Login / Register</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li>Email: info@rawk.edu</li>
                <li>Phone: (555) 123-4567</li>
                <li>Address: 123 Innovation Ave, Tech City</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-6 text-center">
            <p>&copy; {new Date().getFullYear()} Rawk. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 