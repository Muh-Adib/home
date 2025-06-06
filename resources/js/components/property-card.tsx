import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Users, 
  Bed, 
  Bath, 
  Star,
  Eye,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Property {
  id: number;
  name: string;
  slug: string;
  description?: string;
  address: string;
  capacity: number;
  capacity_max: number;
  bedroom_count: number;
  bathroom_count: number;
  base_rate: number;
  status: 'active' | 'inactive' | 'maintenance';
  is_featured: boolean;
  media?: Array<{
    id: number;
    file_path: string;
    is_cover: boolean;
  }>;
}

interface PropertyCardProps {
  property: Property;
  onView?: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onSelect?: (property: Property) => void;
  showActions?: boolean;
}

export function PropertyCard({ 
  property, 
  onView, 
  onEdit, 
  onSelect,
  showActions = true 
}: PropertyCardProps) {
  const coverImage = property.media?.find(m => m.is_cover)?.file_path || '/placeholder-property.jpg';
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="p-0">
        <div className="relative">
          <img
            src={coverImage}
            alt={property.name}
            className="w-full h-48 object-cover rounded-t-lg"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-property.jpg';
            }}
          />
          <div className="absolute top-2 left-2 flex gap-2">
            <Badge className={getStatusColor(property.status)}>
              {property.status}
            </Badge>
            {property.is_featured && (
              <Badge className="bg-blue-100 text-blue-800">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>
          {showActions && (
            <div className="absolute top-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView?.(property)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(property)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Property
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg line-clamp-1">{property.name}</h3>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="line-clamp-1">{property.address}</span>
          </div>
          
          {property.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {property.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{property.capacity}-{property.capacity_max} guests</span>
            </div>
            <div className="flex items-center">
              <Bed className="w-4 h-4 mr-1" />
              <span>{property.bedroom_count} bed</span>
            </div>
            <div className="flex items-center">
              <Bath className="w-4 h-4 mr-1" />
              <span>{property.bathroom_count} bath</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">
            {formatCurrency(property.base_rate)}
          </div>
          <div className="text-sm text-muted-foreground">per night</div>
        </div>
        
        <Button 
          onClick={() => onSelect?.(property)}
          size="sm"
        >
          Select
        </Button>
      </CardFooter>
    </Card>
  );
} 