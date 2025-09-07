// Компонент аватара пользователя с цветным кружком
// Генерирует цвет на основе имени

import React from 'react';
import { generateUserColor, getContrastTextColor, getInitial } from '../../utils/colorUtils';
import './UserAvatar.css';

interface UserAvatarProps {
  name: string;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  className?: string;
  showTooltip?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  name, 
  size = 'medium', 
  className = '',
  showTooltip = false 
}) => {
  const backgroundColor = generateUserColor(name);
  const textColor = getContrastTextColor(backgroundColor);
  const initial = getInitial(name);

  const style = {
    backgroundColor,
    color: textColor,
  };

  return (
    <div 
      className={`user-avatar user-avatar--${size} ${className}`}
      style={style}
      title={showTooltip ? name : undefined}
    >
      {initial}
    </div>
  );
};

export default UserAvatar;