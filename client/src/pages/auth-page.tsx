import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { WaveAnimation } from "@/components/wave-animation";

const authSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  isTeacher: z.boolean().default(true), // Default to true for teacher accounts
});

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [floatingElements, setFloatingElements] = useState<React.ReactNode[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mouseVelocity, setMouseVelocity] = useState({ x: 0, y: 0 });
  const lastMousePosition = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Handle mouse movement with velocity calculation
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const currentTime = Date.now();
    const currentPosition = { x: e.clientX, y: e.clientY };
    
    setMousePosition(currentPosition);
    
    // Calculate velocity if we have previous position
    if (lastMousePosition.current.time > 0) {
      const timeDelta = currentTime - lastMousePosition.current.time;
      if (timeDelta > 0) {
        const xDelta = currentPosition.x - lastMousePosition.current.x;
        const yDelta = currentPosition.y - lastMousePosition.current.y;
        
        setMouseVelocity({
          x: xDelta / timeDelta * 10, // scale for better effect
          y: yDelta / timeDelta * 10
        });
      }
    }
    
    // Update last position
    lastMousePosition.current = {
      x: currentPosition.x,
      y: currentPosition.y,
      time: currentTime
    };
  }, []);

  // Create floating elements for the 3D background
  useEffect(() => {
    const elements = [];
    const count = 20; // Increased number of floating elements
    
    // Calculate radius based on velocity (faster = bigger radius)
    const velocityMagnitude = Math.sqrt(
      mouseVelocity.x * mouseVelocity.x + 
      mouseVelocity.y * mouseVelocity.y
    );
    
    // Cap the influence radius
    const influenceRadius = Math.min(velocityMagnitude * 100, 300);

    for (let i = 0; i < count; i++) {
      // Generate random properties for each element
      const size = Math.random() * 80 + 40;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const animationDelay = Math.random() * 20;
      const opacity = Math.random() * 0.15 + 0.05;
      
      // Calculate unique factor for each element
      const moveFactorX = (i % 5 + 1) * 0.008;
      const moveFactorY = ((i + 2) % 5 + 1) * 0.008;
      
      // Calculate distance from mouse to element's center
      // Convert percentage position to pixel position (approximation)
      const elementX = (left / 100) * window.innerWidth;
      const elementY = (top / 100) * window.innerHeight;
      
      const dx = mousePosition.x - elementX;
      const dy = mousePosition.y - elementY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate mouse influence based on distance and velocity
      const influence = Math.max(0, 1 - distance / influenceRadius);
      
      // Calculate position adjustments with direction based on velocity
      const velocityInfluence = 0.5;
      const adjustX = (
        mousePosition.x * moveFactorX * influence + 
        mouseVelocity.x * velocityInfluence * influence
      );
      const adjustY = (
        mousePosition.y * moveFactorY * influence + 
        mouseVelocity.y * velocityInfluence * influence
      );
      
      // Add 3D rotation effect based on mouse position and velocity
      const rotateX = mouseVelocity.y * influence * 10;
      const rotateY = -mouseVelocity.x * influence * 10;
      const scale = 1 + influence * 0.2; // Slight scale effect
      
      elements.push(
        <div
          key={i}
          className="floating-element"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left: `calc(${left}% + ${adjustX}px)`,
            top: `calc(${top}% + ${adjustY}px)`,
            opacity: opacity + (influence * 0.2), // increase opacity when mouse is near
            animationDelay: `${animationDelay}s`,
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
            transition: 'left 0.3s ease-out, top 0.3s ease-out, transform 0.3s ease-out, opacity 0.3s ease-out',
            zIndex: influence > 0.5 ? 1 : 0 // Bring elements to front when interacting
          }}
        />
      );
    }
    
    setFloatingElements(elements);
  }, [mousePosition, mouseVelocity]);

  // Reset velocity when mouse stops moving
  useEffect(() => {
    const resetVelocity = () => {
      setMouseVelocity({ x: 0, y: 0 });
    };
    
    const timeoutId = setTimeout(resetVelocity, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [mousePosition]);

  const form = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
      isTeacher: true, // Default to teacher account
    },
  });

  const onSubmit = async (values: z.infer<typeof authSchema>, isLogin: boolean) => {
    if (isLogin) {
      loginMutation.mutate(values);
    } else {
      registerMutation.mutate(values);
    }
  };

  return (
    <div 
      className="auth-background" 
      onMouseMove={handleMouseMove}
    >
      {/* Wave Animation */}
      <WaveAnimation />
      
      {/* Floating 3D Elements */}
      {floatingElements}
      
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.svg" alt="WriteTrack Logo" className="h-14 w-14 object-contain" />
              <h1 className="text-4xl font-bold text-black">WriteTrack</h1>
            </div>
            <p className="text-lg text-black">
              A secure platform for essay submissions and grading with keystroke tracking.
            </p>
            <div className="mt-8">
              <p className="text-black">
                Create an account to get started or sign in if you already have one.
              </p>
            </div>
          </div>

          <Card className="auth-card">
            <CardHeader className="flex flex-col items-center text-center">
              <img src="/logo.svg" alt="WriteTrack Logo" className="h-12 w-12 object-contain mb-2" />
              <CardTitle>Welcome to WriteTrack</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="login" className="flex-1">Login</TabsTrigger>
                  <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
                </TabsList>

                <Form {...form}>
                  <TabsContent value="login">
                    <form onSubmit={form.handleSubmit((data) => onSubmit(data, true))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isTeacher"
                        render={({ field }) => (
                          <FormItem className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Register as a teacher</FormLabel>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Note: Only teacher accounts can be created here. Teachers will create student accounts within the platform.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? "Registering..." : "Register"}
                      </Button>
                    </form>
                  </TabsContent>
                </Form>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}