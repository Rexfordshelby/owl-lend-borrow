import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, Calendar, DollarSign } from 'lucide-react';

interface ItemCardProps {
  item: {
    id: string;
    title: string;
    description?: string;
    category: string;
    condition: string;
    daily_rate?: number;
    image_urls?: string[];
    location?: string;
    is_available: boolean;
    owner?: {
      full_name: string;
      trust_score?: number;
      total_ratings?: number;
    };
  };
  onBorrowRequest?: (itemId: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onBorrowRequest }) => {
  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatCondition = (condition: string) => {
    return condition.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getConditionColor = (condition: string) => {
    const colors = {
      'new': 'bg-success-soft text-success',
      'like_new': 'bg-success-soft text-success',
      'good': 'bg-warning-soft text-warning',
      'fair': 'bg-warning-soft text-warning',
      'poor': 'bg-destructive/10 text-destructive',
    };
    return colors[condition as keyof typeof colors] || 'bg-neutral-100 text-neutral-600';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Card className="group hover:shadow-temple transition-all duration-300 border-neutral-200 overflow-hidden">
      {/* Image */}
      <div className="relative h-48 bg-neutral-100 overflow-hidden">
        {item.image_urls && item.image_urls.length > 0 ? (
          <img
            src={item.image_urls[0]}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
            <span className="text-neutral-400 text-sm">No image</span>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <Badge 
            variant={item.is_available ? "default" : "secondary"}
            className={item.is_available ? "bg-success text-success-foreground" : ""}
          >
            {item.is_available ? "Available" : "Borrowed"}
          </Badge>
        </div>

        {/* Category Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
            {formatCategory(item.category)}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg line-clamp-1">{item.title}</h3>
        
        {/* Description */}
        {item.description && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Condition and Price */}
        <div className="flex items-center justify-between">
          <Badge className={getConditionColor(item.condition)}>
            {formatCondition(item.condition)}
          </Badge>
          
          {item.daily_rate && (
            <div className="flex items-center text-temple-red font-semibold">
              <DollarSign className="h-4 w-4" />
              <span>{item.daily_rate}/day</span>
            </div>
          )}
        </div>

        {/* Location */}
        {item.location && (
          <div className="flex items-center text-muted-foreground text-sm">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{item.location}</span>
          </div>
        )}

        {/* Owner Info */}
        {item.owner && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={item.owner.full_name} />
                <AvatarFallback className="bg-temple-red-soft text-temple-red text-xs">
                  {getInitials(item.owner.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{item.owner.full_name}</p>
                {item.owner.trust_score && item.owner.total_ratings && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                    <span>{item.owner.trust_score.toFixed(1)} ({item.owner.total_ratings})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          variant="temple" 
          className="w-full"
          disabled={!item.is_available}
          onClick={() => onBorrowRequest?.(item.id)}
        >
          {item.is_available ? "Request to Borrow" : "Unavailable"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ItemCard;