'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update email_verification_token column to TEXT
    await queryInterface.changeColumn('users', 'email_verification_token', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Update password_reset_token column to TEXT
    await queryInterface.changeColumn('users', 'password_reset_token', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert email_verification_token column back to STRING(255)
    await queryInterface.changeColumn('users', 'email_verification_token', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    // Revert password_reset_token column back to STRING(255)
    await queryInterface.changeColumn('users', 'password_reset_token', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  }
};
