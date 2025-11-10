import React from 'react';
import { TransportMode } from '@/lib/types';
import { FaCar, FaBus, FaTrain, FaPlane } from 'react-icons/fa';

const iconMap: { [key in TransportMode]: React.ComponentType<{ className?: string }> } = {
  [TransportMode.CAR]: FaCar,
  [TransportMode.TRAIN]: FaTrain,
  [TransportMode.BUS]: FaBus,
  [TransportMode.PLANE]: FaPlane,
};

export const TransportIcon: React.FC<{ mode: TransportMode; className?: string }> = ({ mode, className = 'w-6 h-6' }) => {
  const IconComponent = iconMap[mode];
  return IconComponent ? <IconComponent className={className} /> : null;
};