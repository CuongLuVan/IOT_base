import React from 'react';

const styles = {
  root: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    minHeight: 'calc(100vh - 64px)',
  },
  image: {
    display: 'block',
    maxWidth: '100%',
    height: 'auto',
    margin: '0 auto',
    backgroundColor: '#fff',
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
  },
};

const buildScreenPage = (resourceName, imageFile) => {
  const ScreenPage = () => (
    <div style={styles.root}>
      <img
        alt={resourceName}
        src={`/image/screen4/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen4Page1 = buildScreenPage('screen4_1', 'screen4_1.jpg');
export const Screen4Page2 = buildScreenPage('screen4_2', 'screen4_2.jpg');
export const Screen4Page3 = buildScreenPage('screen4_3', 'screen4_3.jpg');
export const Screen4Page4 = buildScreenPage('screen4_4', 'screen4_4.jpg');
export const Screen4Page5 = buildScreenPage('screen4_5', 'screen4_5.jpg');
export const Screen4Page6 = buildScreenPage('screen4_6', 'screen4_6.jpg');
export const Screen4Page7 = buildScreenPage('screen4_7', 'screen4_7.jpg');
