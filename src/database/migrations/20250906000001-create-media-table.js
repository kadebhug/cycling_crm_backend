'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('media', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      entity_type: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          len: [1, 50],
          isIn: [['service_record', 'service_update', 'quotation', 'invoice', 'bike', 'user', 'store']],
        },
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          len: [1, 255],
        },
      },
      original_name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          len: [1, 255],
        },
      },
      mime_type: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          len: [1, 100],
        },
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 104857600, // 100MB max file size
        },
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          len: [1, 500],
        },
      },
      media_type: {
        type: Sequelize.ENUM('image', 'document', 'video'),
        allowNull: false,
      },
      uploaded_by_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex('media', ['entity_type', 'entity_id'], {
      name: 'media_entity_type_entity_id_idx',
    });

    await queryInterface.addIndex('media', ['uploaded_by_id'], {
      name: 'media_uploaded_by_id_idx',
    });

    await queryInterface.addIndex('media', ['media_type'], {
      name: 'media_media_type_idx',
    });

    await queryInterface.addIndex('media', ['mime_type'], {
      name: 'media_mime_type_idx',
    });

    await queryInterface.addIndex('media', ['created_at'], {
      name: 'media_created_at_idx',
    });

    await queryInterface.addIndex('media', ['file_name'], {
      name: 'media_file_name_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('media', 'media_entity_type_entity_id_idx');
    await queryInterface.removeIndex('media', 'media_uploaded_by_id_idx');
    await queryInterface.removeIndex('media', 'media_media_type_idx');
    await queryInterface.removeIndex('media', 'media_mime_type_idx');
    await queryInterface.removeIndex('media', 'media_created_at_idx');
    await queryInterface.removeIndex('media', 'media_file_name_idx');

    // Drop the table
    await queryInterface.dropTable('media');
  }
};