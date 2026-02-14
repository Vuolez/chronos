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
      <li>Выберите подходящие вам даты</li>
      <li>После того как все участники сделают выбор, система найдёт удобную для всех дату</li>
      <li>Вам останется только проголосовать за одну из общих дат</li>
    </ol>
  </div>
);

export default Instructions;
