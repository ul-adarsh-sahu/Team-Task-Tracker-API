const Project = require("../../models/project.model");

const createProject = async ({ name, description, organizationId, createdBy }) => {
  const project = await Project.create({ name, description, organizationId, createdBy });
  return { status: 201, message: "Project created", data: project };
};

const getProjects = async ({ organizationId }) => {
  const projects = await Project.find({ organizationId })
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
  return { status: 200, message: "Projects fetched", data: projects };
};

const getProjectById = async ({ projectId, organizationId }) => {
  const project = await Project.findOne({ _id: projectId, organizationId })
    .populate("createdBy", "name email")
    .lean();
  if (!project) return { status: 404, message: "Project not found" };
  return { status: 200, message: "Project fetched", data: project };
};

const updateProject = async ({ projectId, organizationId, updates }) => {
  const project = await Project.findOneAndUpdate(
    { _id: projectId, organizationId },
    updates,
    { new: true, runValidators: true }
  );
  if (!project) return { status: 404, message: "Project not found" };
  return { status: 200, message: "Project updated", data: project };
};

const deleteProject = async ({ projectId, organizationId }) => {
  const project = await Project.findOneAndDelete({ _id: projectId, organizationId });
  if (!project) return { status: 404, message: "Project not found" };
  return { status: 200, message: "Project deleted" };
};

module.exports = { createProject, getProjects, getProjectById, updateProject, deleteProject };
