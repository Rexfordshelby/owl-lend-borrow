import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X, Upload, Plus, ImageIcon, Trash2 } from 'lucide-react';
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
    hourly_rate: '',
    deposit_amount: '',
    location: '',
    tags: [] as string[],
    is_service: false,
    service_type: '',
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    { value: 'services', label: 'Services' },
    { value: 'other', label: 'Other' },
  ];

  const serviceTypes = [
    'Tutoring',
    'Homework Help',
    'Language Exchange',
    'Pet Sitting',
    'House Sitting',
    'Moving Help',
    'Tech Support',
    'Photography',
    'Design Work',
    'Music Lessons',
    'Other'
  ];

  const conditions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field === 'is_service') {
      setFormData(prev => ({ 
        ...prev, 
        [field]: value === 'true' || value === true,
        condition: value === 'true' || value === true ? 'excellent' : prev.condition,
        service_type: value === 'true' || value === true ? prev.service_type : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Please select only image files.",
        variant: "destructive",
      });
    }
    
    // Limit to 5 images max
    const totalImages = selectedImages.length + imageFiles.length;
    if (totalImages > 5) {
      toast({
        title: "Too many images",
        description: "You can upload a maximum of 5 images.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedImages(prev => [...prev, ...imageFiles]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];
    
    setUploadingImages(true);
    const imageUrls: string[] = [];
    
    try {
      for (const image of selectedImages) {
        const fileName = `${Date.now()}-${image.name}`;
        const { data, error } = await supabase.storage
          .from('chat-images')
          .upload(`items/${fileName}`, image);

        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('chat-images')
          .getPublicUrl(`items/${fileName}`);
        
        imageUrls.push(urlData.publicUrl);
      }
      
      return imageUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
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

      // Upload images first
      const imageUrls = await uploadImages();

      // Create item
      const { error } = await supabase.from('items').insert({
        title: formData.title,
        description: formData.description || null,
        category: formData.category as 'books' | 'electronics' | 'notes' | 'bikes' | 'sports_equipment' | 'tools' | 'clothing' | 'furniture' | 'services' | 'other',
        condition: formData.is_service ? 'excellent' : (formData.condition as 'excellent' | 'good' | 'fair' | 'poor'),
        daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : 0,
        location: formData.location || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        owner_id: profile.id,
        is_available: true,
        is_service: formData.is_service,
        service_type: formData.is_service ? formData.service_type : null
      });

      if (error) throw error;

      toast({
        title: `${formData.is_service ? 'Service' : 'Item'} Listed!`,
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
        hourly_rate: '',
        deposit_amount: '',
        location: '',
        tags: [],
        is_service: false,
        service_type: '',
      });
      setSelectedImages([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
          <DialogTitle>List an {formData.is_service ? 'Service' : 'Item'}</DialogTitle>
          <DialogDescription>
            Add {formData.is_service ? 'a service' : 'an item'} to {formData.is_service ? 'offer' : 'lend'} to fellow Temple University students
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service/Item Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_service"
              checked={formData.is_service}
              onChange={(e) => handleInputChange('is_service', e.target.checked.toString())}
              className="rounded border-gray-300"
            />
            <Label htmlFor="is_service">This is a service (not a physical item)</Label>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{formData.is_service ? 'Service' : 'Item'} Title *</Label>
              <Input
                id="title"
                placeholder={formData.is_service ? "e.g., Math Tutoring, Photo Editing" : "e.g., MacBook Pro 2023, Organic Chemistry Textbook"}
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder={formData.is_service ? "Describe your service, experience, qualifications..." : "Describe your item, its features, any special instructions..."}
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

              {formData.is_service ? (
                <div className="space-y-2">
                  <Label>Service Type *</Label>
                  <Select value={formData.service_type} onValueChange={(value) => handleInputChange('service_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
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
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            {formData.is_service ? (
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.hourly_rate}
                  onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                />
              </div>
            ) : (
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
            )}

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
            <Label htmlFor="location">{formData.is_service ? 'Service Location' : 'Pickup Location'}</Label>
            <Input
              id="location"
              placeholder={formData.is_service ? "e.g., Library, Online, Your Location" : "e.g., Library, Student Center, Dorm Building"}
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

          {/* Image Upload */}
          <div className="space-y-3">
            <Label>Images ({selectedImages.length}/5)</Label>
            <Card className="border-dashed border-2 border-gray-200 hover:border-temple-red transition-colors">
              <CardContent className="p-6">
                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-sm text-gray-600">
                        Drag and drop images here, or{' '}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-temple-red hover:text-temple-red-dark font-medium"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-xs text-gray-500">
                        Upload up to 5 images to showcase your {formData.is_service ? 'service' : 'item'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-temple-red text-temple-red hover:bg-temple-red hover:text-white"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Images
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {selectedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {index + 1}
                    </div>
                  </div>
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
              disabled={!formData.title || !formData.category || (!formData.is_service && !formData.condition) || (formData.is_service && !formData.service_type) || loading || uploadingImages}
            >
              {loading ? "Listing..." : uploadingImages ? "Uploading..." : `List ${formData.is_service ? 'Service' : 'Item'}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemModal;