import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ItemCard from '@/components/ItemCard';
import BorrowRequestModal from '@/components/BorrowRequestModal';
import AddItemModal from '@/components/AddItemModal';
import { Search, Plus, User, Clock, Star, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  title: string;
  description?: string;
  category: string;
  hourly_rate?: number;
  service_type?: string;
  location?: string;
  is_available: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    trust_score?: number;
    total_ratings?: number;
  };
  owner?: {
    full_name: string;
    trust_score?: number;
    total_ratings?: number;
  };
}

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          profiles:owner_id (
            full_name,
            trust_score,
            total_ratings
          )
        `)
        .eq('is_available', true)
        .eq('is_service', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "Error",
        description: "Failed to load services. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedServiceType === 'all' || service.service_type === selectedServiceType;
    return matchesSearch && matchesType;
  });

  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return (a.hourly_rate || 0) - (b.hourly_rate || 0);
      case 'price_high':
        return (b.hourly_rate || 0) - (a.hourly_rate || 0);
      case 'rating':
        return (b.profiles?.trust_score || 0) - (a.profiles?.trust_score || 0);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const handleServiceRequest = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedService(service);
      setShowBorrowModal(true);
    }
  };

  const serviceTypes = [
    { value: 'all', label: 'All Services' },
    { value: 'Tutoring', label: 'Tutoring' },
    { value: 'Homework Help', label: 'Homework Help' },
    { value: 'Language Exchange', label: 'Language Exchange' },
    { value: 'Pet Sitting', label: 'Pet Sitting' },
    { value: 'House Sitting', label: 'House Sitting' },
    { value: 'Moving Help', label: 'Moving Help' },
    { value: 'Tech Support', label: 'Tech Support' },
    { value: 'Photography', label: 'Photography' },
    { value: 'Design Work', label: 'Design Work' },
    { value: 'Music Lessons', label: 'Music Lessons' },
    { value: 'Other', label: 'Other' },
  ];

  const topServiceTypes = services.reduce((acc, service) => {
    const type = service.service_type || 'Other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-temple-red to-temple-red-light bg-clip-text text-transparent">
          Services Marketplace
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Connect with talented Temple University students offering various services. 
          From tutoring to tech support, find the help you need.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-temple-red-soft rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-temple-red" />
              </div>
              <div>
                <p className="text-2xl font-bold">{topServiceTypes['Tutoring'] || 0}</p>
                <p className="text-sm text-muted-foreground">Tutoring</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-temple-red-soft rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-temple-red" />
              </div>
              <div>
                <p className="text-2xl font-bold">{topServiceTypes['Tech Support'] || 0}</p>
                <p className="text-sm text-muted-foreground">Tech Support</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-temple-red-soft rounded-lg flex items-center justify-center">
                <Star className="h-4 w-4 text-temple-red" />
              </div>
              <div>
                <p className="text-2xl font-bold">{topServiceTypes['Photography'] || 0}</p>
                <p className="text-sm text-muted-foreground">Photography</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-temple-red-soft rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-temple-red" />
              </div>
              <div>
                <p className="text-2xl font-bold">{services.length}</p>
                <p className="text-sm text-muted-foreground">Total Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Service Type Filter */}
            <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-neutral-200"></div>
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-neutral-200 rounded"></div>
                <div className="h-3 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-8 bg-neutral-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedServices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            No services found matching your criteria.
          </p>
          <Button variant="temple" className="mt-4" onClick={() => setShowAddServiceModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Offer your first service
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedServices.map((service) => (
            <ItemCard
              key={service.id}
              item={{
                ...service,
                condition: 'excellent',
                is_service: true,
                owner: service.profiles ? {
                  full_name: service.profiles.full_name,
                  trust_score: service.profiles.trust_score,
                  total_ratings: service.profiles.total_ratings,
                } : undefined,
              }}
              onBorrowRequest={handleServiceRequest}
            />
          ))}
        </div>
      )}

      {/* Add floating action button */}
      <div className="fixed bottom-6 right-6">
        <Button 
          variant="temple" 
          size="lg" 
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => setShowAddServiceModal(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Modals */}
      {selectedService && (
        <BorrowRequestModal
          isOpen={showBorrowModal}
          onClose={() => {
            setShowBorrowModal(false);
            setSelectedService(null);
          }}
          item={selectedService}
        />
      )}

      <AddItemModal
        isOpen={showAddServiceModal}
        onClose={() => setShowAddServiceModal(false)}
        onItemAdded={() => {
          fetchServices();
          setShowAddServiceModal(false);
        }}
      />
    </div>
  );
};

export default Services;