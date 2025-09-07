import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ItemCard from '@/components/ItemCard';
import BorrowRequestModal from '@/components/BorrowRequestModal';
import AddItemModal from '@/components/AddItemModal';
import { Search, Filter, Plus, BookOpen, Laptop, Bike, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Item {
  id: string;
  title: string;
  description?: string;
  category: string;
  condition: string;
  daily_rate?: number;
  hourly_rate?: number;
  is_service?: boolean;
  service_type?: string;
  image_urls?: string[];
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

const categoryIcons = {
  books: BookOpen,
  electronics: Laptop,
  bikes: Bike,
  tools: Wrench,
  notes: BookOpen,
  sports_equipment: Bike,
  clothing: Bike,
  furniture: Wrench,
  other: Plus,
};

const Dashboard = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [itemType, setItemType] = useState<string>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to load items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesType = itemType === 'all' || 
                       (itemType === 'items' && !item.is_service) ||
                       (itemType === 'services' && item.is_service);
    return matchesSearch && matchesCategory && matchesType;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        const priceA = a.is_service ? (a.hourly_rate || 0) : (a.daily_rate || 0);
        const priceB = b.is_service ? (b.hourly_rate || 0) : (b.daily_rate || 0);
        return priceA - priceB;
      case 'price_high':
        const priceHighA = a.is_service ? (a.hourly_rate || 0) : (a.daily_rate || 0);
        const priceHighB = b.is_service ? (b.hourly_rate || 0) : (b.daily_rate || 0);
        return priceHighB - priceHighA;
      case 'rating':
        return (b.profiles?.trust_score || 0) - (a.profiles?.trust_score || 0);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const handleBorrowRequest = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setSelectedItem(item);
      setShowBorrowModal(true);
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'books', label: 'Books' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'notes', label: 'Notes' },
    { value: 'bikes', label: 'Bikes' },
    { value: 'sports_equipment', label: 'Sports Equipment' },
    { value: 'tools', label: 'Tools' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'services', label: 'Services' },
    { value: 'other', label: 'Other' },
  ];

  const itemTypes = [
    { value: 'all', label: 'All' },
    { value: 'items', label: 'Items' },
    { value: 'services', label: 'Services' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-temple-red to-temple-red-light bg-clip-text text-transparent">
          Discover & Borrow
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Find what you need from fellow Temple University students. From textbooks to bikes, 
          everything you need is just a request away.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-temple-red-soft rounded-lg flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-temple-red" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.filter(i => i.category === 'books').length}</p>
                <p className="text-sm text-muted-foreground">Books</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-temple-red-soft rounded-lg flex items-center justify-center">
                <Laptop className="h-4 w-4 text-temple-red" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.filter(i => i.category === 'electronics').length}</p>
                <p className="text-sm text-muted-foreground">Electronics</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-temple-red-soft rounded-lg flex items-center justify-center">
                <Bike className="h-4 w-4 text-temple-red" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.filter(i => i.category === 'bikes').length}</p>
                <p className="text-sm text-muted-foreground">Bikes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-temple-red-soft rounded-lg flex items-center justify-center">
                <Plus className="h-4 w-4 text-temple-red" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.filter(i => i.is_service).length}</p>
                <p className="text-sm text-muted-foreground">Services</p>
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
                  placeholder="Search for items and services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <Select value={itemType} onValueChange={setItemType}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
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

      {/* Items Grid */}
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
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            No {itemType === 'all' ? 'items or services' : itemType} found matching your criteria.
          </p>
          <Button variant="temple" className="mt-4" onClick={() => setShowAddItemModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            List your first {itemType === 'services' ? 'service' : 'item'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={{
                ...item,
                owner: item.profiles ? {
                  full_name: item.profiles.full_name,
                  trust_score: item.profiles.trust_score,
                  total_ratings: item.profiles.total_ratings,
                } : undefined,
              }}
              onBorrowRequest={handleBorrowRequest}
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
          onClick={() => setShowAddItemModal(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Modals */}
      {selectedItem && (
        <BorrowRequestModal
          isOpen={showBorrowModal}
          onClose={() => {
            setShowBorrowModal(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
        />
      )}

      <AddItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onItemAdded={() => {
          fetchItems();
          setShowAddItemModal(false);
        }}
      />
    </div>
  );
};

export default Dashboard;