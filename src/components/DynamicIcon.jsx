import React from 'react';
import {
  LayoutGrid,
  GlassWater,
  Citrus,
  Coffee,
  CupSoda,
  Flame,
  Milk,
  Soup,
  Wheat,
  Apple,
  Sandwich,
  CookingPot,
  Egg,
  Cookie,
  Utensils,
  Sun,
  UtensilsCrossed,
  Sparkles,
  Salad,
  Mountain,
  Layers,
  Pizza,
  Drumstick,
  Fish,
  Star,
  Cake,
  Martini,
  Beer,
  Wine,
  Croissant
} from 'lucide-react';

const ICON_MAP = {
  'layout-grid': LayoutGrid,
  'glass-water': GlassWater,
  'citrus': Citrus,
  'coffee': Coffee,
  'cup-soda': CupSoda,
  'flame': Flame,
  'milk': Milk,
  'soup': Soup,
  'wheat': Wheat,
  'apple': Apple,
  'sandwich': Sandwich,
  'cooking-pot': CookingPot,
  'egg': Egg,
  'cookie': Cookie,
  'utensils': Utensils,
  'sun': Sun,
  'utensils-crossed': UtensilsCrossed,
  'sparkles': Sparkles,
  'salad': Salad,
  'mountain': Mountain,
  'layers': Layers,
  'pizza': Pizza,
  'drumstick': Drumstick,
  'fish': Fish,
  'star': Star,
  'cake': Cake,
  'martini': Martini,
  'beer': Beer,
  'wine': Wine,
  'croissant': Croissant
};

export const DynamicIcon = ({ name, size = 18, className = '', ...props }) => {
  const IconComponent = (name && ICON_MAP[name]) || Utensils;
  return <IconComponent size={size} className={className} {...props} />;
};

export default DynamicIcon;
