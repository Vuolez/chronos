// Общий компонент инструкции «Как это работает»
// Используется в боковой панели (десктоп) и над календарём (мобильные)

import React from 'react';
import './Instructions.css';

interface InstructionsProps {
  /** Вариант отображения: sidebar — в панели участников, mobile — над календарём */
  variant: 'sidebar' | 'mobile';
}

const Instructions: React.FC<InstructionsProps> = ({ variant }) => (
  <div className={`instructions instructions--${variant}`}>
    <h4>Как это работает:</h4>
    <ol>
      <li>1. Выберите подходящие вам даты</li>
      <li>2. После того как все участники выберут даты, система найдёт общие удобные даты</li>
      <li>3. Вам останется только выбрать одну из общих дат</li>
    </ol>
  </div>
);

export default Instructions;
