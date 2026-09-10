const up = async (connection) => {
  await connection.run(`
    UPDATE users
    SET profileIcon = CASE
      WHEN LOWER(TRIM(profileIcon)) GLOB 'chippy-[1-8]'
        OR LOWER(TRIM(profileIcon)) GLOB 'lucky-[1-8]'
        THEN LOWER(TRIM(profileIcon))
      WHEN TRIM(profileIcon) IN ('1', '2', '3', '4')
        THEN 'chippy-' || TRIM(profileIcon)
      WHEN LOWER(TRIM(profileIcon)) GLOB 'icon-[1-4]'
        THEN 'chippy-' || SUBSTR(LOWER(TRIM(profileIcon)), 6)
      ELSE 'chippy-1'
    END
  `);
};

module.exports = { up };