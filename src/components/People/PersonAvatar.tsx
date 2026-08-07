import React from 'react';
import type { Person } from '../../types';
import { getPersonColor } from '../../constants/people';

interface PersonAvatarProps {
  person: Person;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'w-8 h-8 text-base',
  md: 'w-11 h-11 text-xl',
  lg: 'w-14 h-14 text-2xl'
};

export const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, size = 'md' }) => {
  const color = getPersonColor(person.color);
  return (
    <span
      className={`${SIZES[size]} ${color.chip} rounded-full border flex items-center justify-center shrink-0 select-none`}
      title={person.name}
    >
      {person.emoji || person.name.charAt(0).toUpperCase()}
    </span>
  );
};
