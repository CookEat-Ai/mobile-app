import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Colors } from '../constants/Colors';

export const LuckyWheelIcon = ({ size = 60 }: { size?: number }) => {
  const center = size / 2;
  const radius = (size / 2) - 4;

  const segments = [
    { label: '15', color: '#E0E0E0', textColor: '#333' },
    { label: '25', color: Colors.light.button, textColor: '#FFF' },
    { label: '33', color: '#000000', textColor: '#FFF' },
    { label: '15', color: '#E0E0E0', textColor: '#333' },
    { label: '25', color: Colors.light.button, textColor: '#FFF' },
    { label: '33', color: '#000000', textColor: '#FFF' },
  ];

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {segments.map((seg, i) => {
            const startAngle = (i * 60) * Math.PI / 180;
            const endAngle = ((i + 1) * 60) * Math.PI / 180;
            const textAngle = (i * 60 + 30) * Math.PI / 180;
            
            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);
            
            const textRadius = radius * 0.62;
            const tx = center + textRadius * Math.cos(textAngle);
            const ty = center + textRadius * Math.sin(textAngle);

            return (
              <G key={i}>
                <Path 
                  d={`M${center},${center} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`} 
                  fill={seg.color} 
                />
                <SvgText
                  x={tx}
                  y={ty}
                  fill={seg.textColor}
                  fontSize={size * 0.12}
                  fontWeight="bold"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  transform={`rotate(${i * 60 + 120}, ${tx}, ${ty})`}
                >
                  {seg.label}
                </SvgText>
              </G>
            );
          })}
          
          <Circle cx={center} cy={center} r={radius} stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
          
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <Circle 
              key={angle}
              cx={center + (radius) * Math.cos(angle * Math.PI / 180)}
              cy={center + (radius) * Math.sin(angle * Math.PI / 180)}
              r="1.2"
              fill="#FF3B30"
            />
          ))}
        </G>
        <Circle cx={center} cy={center} r={size * 0.08} fill="#FFFFFF" />
      </Svg>
    </View>
  );
};
