import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Users, Shield, Zap, ArrowRight, Star } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: BookOpen,
      title: "Diverse Categories",
      description: "From textbooks to bikes, find everything you need for campus life."
    },
    {
      icon: Users,
      title: "Temple Community",
      description: "Connect with fellow Temple University students in a trusted environment."
    },
    {
      icon: Shield,
      title: "Safe & Secure",
      description: "User ratings and reviews ensure trustworthy transactions."
    },
    {
      icon: Zap,
      title: "Quick & Easy",
      description: "Simple request process with instant notifications."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      year: "Junior, Business",
      content: "Found my textbooks for half the price! TempleBorrow saved me hundreds this semester.",
      rating: 5
    },
    {
      name: "Marcus Johnson", 
      year: "Senior, Engineering",
      content: "Borrowed a bike for the semester instead of buying one. Perfect for campus commuting!",
      rating: 5
    },
    {
      name: "Emma Rodriguez",
      year: "Sophomore, Arts",
      content: "Great way to share resources with other students. Love the community aspect!",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-temple-red-soft to-neutral-50 py-20 px-4">
        <div className="container mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-temple-red to-temple-red-light bg-clip-text text-transparent">
              TempleBorrow
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              The peer-to-peer borrowing platform for Temple University students. 
              Share resources, save money, build community.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="temple" 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-4 h-auto"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/dashboard')}
              className="text-lg px-8 py-4 h-auto"
            >
              Browse Items
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-temple-red" />
              <span>Temple Students Only</span>
            </div>
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-2 text-temple-red" />
              <span>Safe & Trusted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Why Choose TempleBorrow?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built specifically for Temple University students to share resources safely and affordably.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-neutral-200 hover:shadow-temple transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-temple-red-soft rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-temple-red" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-neutral-50">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Simple steps to start borrowing and lending
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-temple-red rounded-full flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold">Sign Up</h3>
              <p className="text-muted-foreground">
                Create your account with your Temple University email address.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-temple-red rounded-full flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold">Browse & Request</h3>
              <p className="text-muted-foreground">
                Find items you need and send borrow requests to owners.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-temple-red rounded-full flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold">Borrow & Return</h3>
              <p className="text-muted-foreground">
                Meet up, enjoy the item, and return it when done. Rate your experience!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              What Students Say
            </h2>
            <p className="text-xl text-muted-foreground">
              Real experiences from Temple University students
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-neutral-200">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.year}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-temple-red to-temple-red-light">
        <div className="container mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to Start Sharing?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Join the Temple University community and start borrowing and lending today.
            </p>
          </div>
          
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => navigate('/auth')}
            className="text-lg px-8 py-4 h-auto bg-white text-temple-red hover:bg-white/90"
          >
            Join TempleBorrow
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-temple-red to-temple-red-light rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TB</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-temple-red to-temple-red-light bg-clip-text text-transparent">
              TempleBorrow
            </span>
          </div>
          <p className="text-muted-foreground">
            © 2024 TempleBorrow. Built for Temple University students.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
