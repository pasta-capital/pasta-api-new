import express from "express";
import { verifyToken, authorizeModules } from "../middlewares/authJwt";
import {
  createGroup,
  deleteGroup,
  getGroup,
  listGroups,
  updateGroup,
} from "../controllers/groupController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Users groups management
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     UsersGroup:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         users:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "665e3e2f2a9bd8c4b2c12345"
 *         title: "VIP Clients"
 *         description: "Top tier clients"
 *         users: ["665e3e2f2a9bd8c4b2c11111", "665e3e2f2a9bd8c4b2c22222"]
 *         createdAt: "2025-09-25T16:00:00.000Z"
 *         updatedAt: "2025-09-25T16:00:00.000Z"
 *     CreateGroupRequest:
 *       type: object
 *       required: [title]
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         users:
 *           type: array
 *           items:
 *             type: string
 *       example:
 *         title: "VIP Clients"
 *         description: "Top tier clients"
 *         users: ["665e3e2f2a9bd8c4b2c11111", "665e3e2f2a9bd8c4b2c22222"]
 *     UpdateGroupRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateGroupRequest'
 */

/**
 * @swagger
 * /groups:
 *   post:
 *     tags: [Groups]
 *     summary: Create a users group
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGroupRequest'
 *     responses:
 *       201:
 *         description: Group created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/UsersGroup'
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   get:
 *     tags: [Groups]
 *     summary: List groups
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Groups retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

router.use(verifyToken, authorizeModules("notifications"));

/**
 * Routes: Create/List groups
 */
router.route("/").post(createGroup).get(listGroups);
/**
 * @swagger
 * /groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get a group by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   patch:
 *     tags: [Groups]
 *     summary: Update a group
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateGroupRequest'
 *     responses:
 *       200:
 *         description: Group updated
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Groups]
 *     summary: Delete a group
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.route("/:id").get(getGroup).patch(updateGroup).delete(deleteGroup);

export default router;
