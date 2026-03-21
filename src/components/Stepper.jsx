import React from 'react';
import { T, FONT } from '../config/theme.js';

export function Stepper(props) {
  var steps = props.steps || [];
  var active = props.active || 0;

  var containerStyle = {
    display: 'flex',
    alignItems: 'flex-start',
  };

  var elements = [];
  var i = 0;
  while (i < steps.length) {
    var completed = i < active;
    var isCurrent = i === active;

    var circleStyle = {
      width: 20,
      height: 20,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 10,
      fontWeight: 700,
      fontFamily: FONT.mono,
      flexShrink: 0,
    };

    if (completed) {
      circleStyle.background = T.gold;
      circleStyle.color = '#000';
    } else if (isCurrent) {
      circleStyle.border = '2px solid ' + T.gold;
      circleStyle.color = T.gold;
      circleStyle.background = 'transparent';
    } else {
      circleStyle.border = '1px solid ' + T.faint;
      circleStyle.color = T.faint;
      circleStyle.background = 'transparent';
    }

    var labelStyle = {
      fontSize: 8,
      color: (completed || isCurrent) ? T.gold : T.faint,
      fontFamily: FONT.body,
      letterSpacing: '0.3px',
      textTransform: 'uppercase',
      marginTop: 4,
      textAlign: 'center',
      maxWidth: 60,
    };

    var stepCol = React.createElement(
      'div',
      {
        key: 'step-' + i,
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      },
      React.createElement('div', { style: circleStyle }, i + 1),
      React.createElement('div', { style: labelStyle }, steps[i].label)
    );

    elements.push(stepCol);

    // connecting line (not after last step)
    if (i < steps.length - 1) {
      var lineStyle = {
        height: 2,
        flex: 1,
        background: completed ? T.gold : T.bg3,
        alignSelf: 'center',
        marginTop: -10, // align with circle center area
        minWidth: 16,
      };
      elements.push(
        React.createElement('div', { key: 'line-' + i, style: lineStyle })
      );
    }

    i++;
  }

  return React.createElement('div', { style: containerStyle }, elements);
}
