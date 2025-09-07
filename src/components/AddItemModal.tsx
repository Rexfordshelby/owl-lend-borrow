import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onItemAdded }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    condition: '',
    daily_rate: '',
    deposit_amount: '',
    location: '',
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const categories = [
    { value: 'books', label: 'Books' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'notes', label: 'Notes' },
    { value: 'bikes', label: 'Bikes' },
    { value: 'sports_equipment', label: 'Sports Equipment' },
    { value: 'tools', label: 'Tools' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'other', label: 'Other' },
  ];

  const conditions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create item
      const { error } = await supabase.from('items').insert({
        title: formData.title,
        description: formData.description || null,
        category: formData.category as 'books' | 'electronics' | 'notes' | 'bikes' | 'sports_equipment' | 'tools' | 'clothing' | 'furniture' | 'other',
        condition: formData.condition,
        daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : 0,
        location: formData.location || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        owner_id: profile.id,
        is_available: true
      });

      if (error) throw error;

      toast({
        title: "Item Listed!",
        description: `"${formData.title}" has been successfully added to your listings.`,
      });

      onItemAdded();
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        condition: '',
        daily_rate: '',
        deposit_amount: '',
        location: '',
        tags: [],
      });
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: "Error",
        description: "Failed to list item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>List an Item</DialogTitle>
          <DialogDescription>
            Add an item to lend to fellow Temple University students
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Item Title *</Label>
              <Input
                id="title"
                placeholder="e.g., MacBook Pro 2023, Organic Chemistry Textbook"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your item, its features, any special instructions..."
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition *</Label>
                <Select value={formData.condition} onValueChange={(value) => handleInputChange('condition', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map((condition) => (
                      <SelectItem key={condition.value} value={condition.value}>
                        {condition.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daily_rate">Daily Rate ($)</Label>
              <Input
                id="daily_rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.daily_rate}
                onChange={(e) => handleInputChange('daily_rate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit_amount">Deposit Amount ($)</Label>
              <Input
                id="deposit_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.deposit_amount}
                onChange={(e) => handleInputChange('deposit_amount', e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Pickup Location</Label>
            <Input
              id="location"
              placeholder="e.g., Library, Student Center, Dorm Building"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="temple" 
              className="flex-1"
              disabled={!formData.title || !formData.category || !formData.condition || loading}
            >
              {loading ? "Listing..." : "List Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemModal;