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
        src={`/image/screen6/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen6Page1 = buildScreenPage('screen6_1', 'screen6_1.jpg');
export const Screen6Page2 = buildScreenPage('screen6_2', 'screen6_2.jpg');
export const Screen6Page3 = buildScreenPage('screen6_3', 'screen6_3.jpg');
export const Screen6Page4 = buildScreenPage('screen6_4', 'screen6_4.jpg');
export const Screen6Page5 = buildScreenPage('screen6_5', 'screen6_5.jpg');
export const Screen6Page6 = buildScreenPage('screen6_6', 'screen6_6.jpg');
export const Screen6Page7 = buildScreenPage('screen6_7', 'screen6_7.jpg');
